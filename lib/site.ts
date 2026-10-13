// Site-wide constants. The site name (design/DESIGN.md) is set only here.

export const SITE_NAME = "finance-community";

export const SITE_DESCRIPTION =
	"Finance jobs from US employers' own hiring pages. You apply directly with the company.";

// Absolute site address for canonical tags and structured data (CLAUDE.md section 4):
// http://localhost:3000 locally (.env.local), the live domain online. No trailing slash.
export function siteUrl(): string {
	const url = process.env.SITE_URL?.trim().replace(/\/+$/, "");
	if (url) return url.toLowerCase();
	if (process.env.NODE_ENV === "production") throw new Error("SITE_URL is not set");
	return "http://localhost:3000";
}

// Whether search engines may index the site (ALLOW_INDEXING). Default OFF, so a temporary address
// (e.g. TrueFoundry's) is never indexed by mistake: robots.txt then disallows everything and every
// response gets "X-Robots-Tag: noindex, nofollow" (proxy.ts). Set ALLOW_INDEXING=true only on the
// real domain. Read at request time, so the same image works for both.
export function indexingAllowed(): boolean {
	return ["true", "1", "yes"].includes(String(process.env.ALLOW_INDEXING ?? "").trim().toLowerCase());
}
