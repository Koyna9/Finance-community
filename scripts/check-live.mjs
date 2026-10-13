// Launch check for the live site (read-only: only GET requests, no database, no API credits).
// Checks what the SEO audit (2026-10-12) marked critical: the domain in canonicals and the sitemap,
// robots.txt, the noindex header, and JobPosting on job pages.
//
//   npm run check-live -- https://www.example.com             real domain: indexing must be ON
//   npm run check-live -- https://dev-job-portal.adoptapp.ai --staging   indexing must be OFF
//   options: --sample=20 (job pages to check; default 20)
//
// Exit code 0 = all passed, 1 = something failed (each FAIL line says what).

const args = process.argv.slice(2);
const base = args.find((a) => !a.startsWith("--"))?.replace(/\/+$/, "");
const staging = args.includes("--staging");
const sample = Number(args.find((a) => a.startsWith("--sample="))?.split("=")[1] ?? 20);
if (!base) {
	console.error("Usage: npm run check-live -- https://your-domain [--staging] [--sample=20]");
	process.exit(1);
}

let failed = 0;
function check(ok, what, detail = "") {
	console.log(`${ok ? "PASS" : "FAIL"}  ${what}${detail ? `  (${detail})` : ""}`);
	if (!ok) failed++;
}

// GET with up to 3 tries (a network hiccup is not a site problem); status 0 = no answer at all.
async function get(path) {
	for (let attempt = 1; ; attempt++) {
		try {
			const res = await fetch(base + path, {
				redirect: "manual",
				headers: { "user-agent": "finance-community check-live" },
				signal: AbortSignal.timeout(20_000),
			});
			return { status: res.status, headers: res.headers, text: await res.text() };
		} catch (error) {
			if (attempt === 3) {
				console.log(`      (no answer from ${path}: ${error.cause?.code ?? error.message})`);
				return { status: 0, headers: new Headers(), text: "" };
			}
		}
	}
}
const canonicalOf = (html) => html.match(/<link rel="canonical" href="([^"]*)"/)?.[1] ?? null;
const metaRobots = (html) => html.match(/<meta name="robots" content="([^"]*)"/)?.[1] ?? null;
const noindexHeader = (r) => /noindex/i.test(r.headers.get("x-robots-tag") ?? "");

console.log(`Checking ${base} (${staging ? "staging: search engines must be BLOCKED" : "live domain: search engines must be ALLOWED"})\n`);

// 1. The address itself.
check(base.startsWith("https://"), "address uses https");
check(!/localhost|127\.0\.0\.1/.test(base), "address is not localhost");

// 2. robots.txt
const robots = await get("/robots.txt");
check(robots.status === 200, "robots.txt answers 200", String(robots.status));
if (staging) {
	check(/Disallow: \/\s*$/m.test(robots.text), "robots.txt blocks everything (Disallow: /)");
} else {
	check(!/^Disallow: \/\s*$/m.test(robots.text), "robots.txt does not block the whole site");
	check(robots.text.includes(`Sitemap: ${base}/sitemap.xml`), "robots.txt lists the sitemap on this domain");
}

// 3. Home page
const home = await get("/");
check(home.status === 200, "home page answers 200", String(home.status));
check(canonicalOf(home.text) === base, "home canonical is this domain", canonicalOf(home.text) ?? "none");
if (staging) check(noindexHeader(home), "home has the noindex header (blocked)");
else {
	check(!noindexHeader(home), "home has no noindex header", home.headers.get("x-robots-tag") ?? "");
	check(!/noindex/.test(metaRobots(home.text) ?? ""), "home has no noindex meta tag");
}
check(home.text.includes('"@type":"WebSite"'), "home has WebSite structured data");

// 4. Sitemap: an index of parts (/sitemaps/<type>.xml); every URL in every part on this domain
const sitemap = await get("/sitemap.xml");
check(sitemap.status === 200, "sitemap.xml answers 200", String(sitemap.status));
const locsIn = (xml) => [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
let locs = locsIn(sitemap.text);
if (sitemap.text.includes("<sitemapindex")) {
	const parts = locs;
	locs = [];
	let badParts = [];
	for (const part of parts) {
		const r = part.startsWith(base) ? await get(part.slice(base.length)) : { status: 0, text: "" };
		if (r.status !== 200) badParts.push(`${part} -> ${r.status}`);
		locs.push(...locsIn(r.text));
	}
	check(badParts.length === 0, `${parts.length} sitemap parts answer 200 on this domain`, badParts.slice(0, 3).join(", "));
}
const offDomain = locs.filter((u) => !u.startsWith(`${base}/`) && u !== base);
check(locs.length > 0, "sitemap lists URLs", `${locs.length} URLs`);
check(offDomain.length === 0, "every sitemap URL is on this domain", offDomain.slice(0, 3).join(", "));

// 5. Sample pages: canonical on this domain (catches old CDN copies), no noindex when live.
const jobs = locs.filter((u) => u.includes("/jobs/")).slice(0, sample);
const others = ["/finance-jobs", "/salaries", "/locations", "/about"];
let badCanonical = [];
let badIndex = [];
let noJobPosting = [];
for (const url of [...others.map((p) => base + p), ...jobs]) {
	const r = await get(url.slice(base.length));
	const canonical = canonicalOf(r.text);
	if (r.status !== 200 || !canonical?.startsWith(base)) badCanonical.push(`${url.slice(base.length)} -> ${r.status} ${canonical}`);
	if (!staging && (noindexHeader(r) || /noindex/.test(metaRobots(r.text) ?? ""))) badIndex.push(url.slice(base.length));
	if (url.includes("/jobs/") && !r.text.includes('"@type":"JobPosting"')) noJobPosting.push(url.slice(base.length));
}
const n = others.length + jobs.length;
check(badCanonical.length === 0, `${n} sample pages: 200 with a canonical on this domain`, badCanonical.slice(0, 3).join("; "));
if (!staging) check(badIndex.length === 0, `${n} sample pages: indexable (no noindex)`, badIndex.slice(0, 3).join(", "));
check(noJobPosting.length === 0, `${jobs.length} job pages have JobPosting data`, noJobPosting.slice(0, 3).join(", "));

// 6. Health check
const health = await get("/healthz");
check(health.status === 200 && health.text.trim() === "ok", "/healthz answers ok");

console.log(failed ? `\n${failed} check(s) FAILED.` : "\nAll checks passed.");
if (failed && badCanonical.length) {
	console.log("Old canonicals on sample pages usually mean CDN copies from before a SITE_URL change: run the CloudFront invalidation /*.");
}
process.exit(failed ? 1 : 0);
