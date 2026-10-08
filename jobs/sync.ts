// Nightly sync (CLAUDE.md section 10). Locally: `npm run sync` (= payload run jobs/sync.ts, reads
// .env.local). Online: a TrueFoundry Job with a schedule trigger `0 2 * * *` (UTC), same Docker image.
//
//   1. New jobs: GET /active-ats (time_frame=24h, our filters), at most MAX_JOBS_PER_RUN jobs and never
//      below MIN_CREDITS_RESERVE Jobs credits left. Raw response saved to data/sync/ BEFORE processing.
//      Only jobs whose sourceId is not in the database yet are created; existing jobs are never
//      overwritten, so admin edits (category, level, hidden) are kept.
//   2. Closed jobs: GET /expired-ats?time_frame=1d (no Jobs credits; a plain JSON array of job ids),
//      then status = "closed" on our open jobs in that list. Runs even if step 1 failed.
//   3. Always one sync-runs document (ranAt, added, closed, error / "stopped: ..." note).
// Exit code 0 on success, 1 on failure (so TrueFoundry shows failed runs).
//
// Settings (environment): MAX_JOBS_PER_RUN (5), MIN_CREDITS_RESERVE (10), FANTASTIC_JOBS_KEY,
// DATABASE_URL, PAYLOAD_SECRET. Optional: EXPIRED_TIME_FRAME (1d; use 1m once on go-live day).

import { mkdirSync, writeFileSync } from "node:fs";
import { getPayload } from "payload";
import { bumpCacheVersion } from "../lib/cache";
import config from "../payload.config";
import type { Job } from "../payload-types";
import { apiGet, baseFilters, lastCredits } from "../scripts/fantastic.mjs";
import { toJobData, toRow } from "../shared/rules.js";

const MAX_JOBS_PER_RUN = intSetting("MAX_JOBS_PER_RUN", 5);
const MIN_CREDITS_RESERVE = intSetting("MIN_CREDITS_RESERVE", 10);
const EXPIRED_TIME_FRAME = process.env.EXPIRED_TIME_FRAME ?? "1d";
const PAGE_LIMIT = 1000; // API maximum

function intSetting(name: string, fallback: number): number {
	const n = Number.parseInt(String(process.env[name] ?? ""), 10);
	return Number.isFinite(n) && n >= 0 ? n : fallback;
}

const payload = await getPayload({ config });
const ranAt = new Date().toISOString();
const notes: string[] = []; // "stopped: ..." notes
const errors: string[] = [];
let added = 0;
let closed = 0;
let requestsLeft: number | null = null;
let jobsLeft: number | null = null;

// Raw API responses are saved before processing (CLAUDE.md section 6, budget rule 7).
const SYNC_DIR = new URL("../data/sync/", import.meta.url);
function saveRaw(name: string, body: unknown) {
	mkdirSync(SYNC_DIR, { recursive: true });
	const file = new URL(`${ranAt.replace(/[:.]/g, "-")}-${name}.json`, SYNC_DIR);
	writeFileSync(file, JSON.stringify(body));
	return file.pathname.split("/data/")[1];
}

// x-api-* credit headers (from scripts/fantastic.mjs or data/credits.json).
function readCredits(headers: object) {
	const credits = headers as Record<string, string | undefined>;
	if (credits["x-api-jobs-remaining"]) jobsLeft = Number(credits["x-api-jobs-remaining"]);
	if (credits["x-api-requests-remaining"]) requestsLeft = Number(credits["x-api-requests-remaining"]);
}

// ---- 1. New jobs -------------------------------------------------------------------------------

async function fetchNewJobs() {
	// Jobs credits left: from the last API response (data/credits.json), when we have it.
	const known = lastCredits();
	if (known) readCredits(known);

	// Only ask for jobs posted at or after our newest job (no paying twice for what we have).
	const newest = await payload.find({ collection: "jobs", sort: "-datePosted", limit: 1, depth: 0, select: { datePosted: true } });
	const since = newest.docs[0]?.datePosted ? new Date(newest.docs[0].datePosted).toISOString().slice(0, 19) : null;

	let fetched = 0;
	let offset = 0;
	while (true) {
		if (fetched >= MAX_JOBS_PER_RUN) {
			notes.push(`stopped: nightly cap ${MAX_JOBS_PER_RUN} reached`);
			return;
		}
		// Unknown credits (e.g. first run online): ask for 1 job first, to read the credit headers.
		const affordable = jobsLeft === null ? 1 : jobsLeft - MIN_CREDITS_RESERVE;
		const limit = Math.min(MAX_JOBS_PER_RUN - fetched, affordable, PAGE_LIMIT);
		if (limit <= 0) {
			notes.push(`stopped: credit reserve ${MIN_CREDITS_RESERVE} reached (${jobsLeft} Jobs credits left)`);
			return;
		}

		const params: Record<string, string> = {
			...baseFilters(),
			time_frame: "24h",
			limit: String(limit),
			offset: String(offset),
			description_format: "text",
			include_basic_organization_details: "true",
		};
		if (since) params.date_posted_gte = since;
		const res = await apiGet("/active-ats", params);
		readCredits(res.credits);
		if (res.status !== 200 || !Array.isArray(res.body)) {
			throw new Error(`active-ats HTTP ${res.status}: ${JSON.stringify(res.body).slice(0, 200)}`);
		}
		const page = res.body as Record<string, unknown>[];
		const file = saveRaw(`active-${offset}`, page);
		console.log(`active-ats: ${page.length} jobs (saved to data/${file}). Jobs credits left: ${jobsLeft}`);
		fetched += page.length;
		offset += page.length;

		// Create only jobs we don't have yet (by sourceId).
		const ids = page.map((j) => Number(j.id)).filter(Number.isFinite);
		const existing = await payload.find({
			collection: "jobs",
			where: { sourceId: { in: ids } },
			limit: ids.length || 1,
			depth: 0,
			select: { sourceId: true },
		});
		const have = new Set(existing.docs.map((d) => d.sourceId));
		let rejected = 0;
		for (const apiJob of page) {
			if (have.has(Number(apiJob.id))) continue;
			const row = toRow(apiJob);
			if (!row) {
				rejected++;
				continue;
			}
			const data = toJobData(row) as Omit<Job, "id" | "createdAt" | "updatedAt">;
			await payload.create({ collection: "jobs", data, depth: 0 });
			have.add(Number(apiJob.id));
			added++;
		}
		console.log(`  created ${added} so far, skipped ${have.size - added} already in the database, rejected ${rejected} by toRow`);

		if (page.length < limit) {
			notes.push(`stopped: no more new jobs (${fetched} fetched)`);
			return;
		}
	}
}

// ---- 2. Closed jobs ----------------------------------------------------------------------------

async function closeExpiredJobs() {
	const res = await apiGet("/expired-ats", { time_frame: EXPIRED_TIME_FRAME });
	readCredits(res.credits);
	if (res.status !== 200 || !Array.isArray(res.body)) {
		throw new Error(`expired-ats HTTP ${res.status}: ${JSON.stringify(res.body).slice(0, 200)}`);
	}
	const file = saveRaw(`expired-${EXPIRED_TIME_FRAME}`, res.body);
	// Expected: [123, 456, ...] (OpenAPI spec). Also accept [{ id: 123 }] or ["123"], just in case.
	const expired = new Set<number>(
		(res.body as unknown[])
			.map((x) => Number(typeof x === "object" && x !== null ? (x as { id?: unknown }).id : x))
			.filter(Number.isFinite),
	);
	const sample = JSON.stringify((res.body as unknown[]).slice(0, 3));
	console.log(`expired-ats (${EXPIRED_TIME_FRAME}): ${expired.size} ids, first items ${sample} (saved to data/${file})`);

	// Our open jobs whose sourceId is in that list (our list is small; the API list can be huge).
	const open = await payload.find({
		collection: "jobs",
		where: { status: { equals: "open" } },
		pagination: false,
		depth: 0,
		select: { sourceId: true },
	});
	const toClose = open.docs.filter((d) => expired.has(d.sourceId)).map((d) => d.id);
	if (toClose.length > 0) {
		await payload.update({ collection: "jobs", where: { id: { in: toClose } }, data: { status: "closed" } });
	}
	closed = toClose.length;
	console.log(`  closed ${closed} of our ${open.docs.length} open jobs`);
}

// ---- Run ---------------------------------------------------------------------------------------

console.log(`Sync ${ranAt}: MAX_JOBS_PER_RUN=${MAX_JOBS_PER_RUN}, MIN_CREDITS_RESERVE=${MIN_CREDITS_RESERVE}`);
for (const [step, fn] of [
	["new jobs", fetchNewJobs],
	["closed jobs", closeExpiredJobs],
] as const) {
	try {
		await fn();
	} catch (err) {
		errors.push(`${step}: ${err instanceof Error ? err.message : String(err)}`);
		console.error(`ERROR in ${step}:`, err);
	}
}

const error = [...errors, ...notes].join(" | ").slice(0, 1000) || null;
let exitCode = errors.length ? 1 : 0;
try {
	await payload.create({ collection: "sync-runs", data: { ranAt, added, closed, error } });
} catch (err) {
	console.error("Could not save the sync-runs document:", err);
	exitCode = 1;
}
console.log(`\nDone: added ${added}, closed ${closed}. ${error ?? ""}`);
console.log(`Jobs credits left: ${jobsLeft ?? "unknown"}. Request credits left: ${requestsLeft ?? "unknown"}`);
// Clear the site's Redis cache, after all writes are committed (lib/cache.ts; no-op without REDIS_URL).
// A cache problem never fails the sync (fail-open).
if (await bumpCacheVersion()) console.log("Site cache cleared (new cache version).");
process.exit(exitCode);
