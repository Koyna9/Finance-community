// Load the saved raw API files into Payload's `jobs` collection (CLAUDE.md sections 5 and 6).
// NO API calls: it only reads data/*.json. Jobs that already exist (same sourceId) are skipped,
// so admin edits are never overwritten and the script is safe to run again.
//
//   npm run load-jobs          (= payload run scripts/load-jobs.ts; reads .env.local)

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { getPayload } from "payload";
import { bumpCacheVersion } from "../lib/cache";
import config from "../payload.config";
import type { Job } from "../payload-types";
import { toJobData, toRow } from "../shared/rules.js";

// The backfill files, then the new jobs saved by each sync run (data/sync/<time>-active-<offset>.json,
// oldest first). The sync writes its jobs straight into the database, so without these files a fresh
// database (a new teammate, production) would miss them.
const SYNC_DIR = new URL("../data/sync/", import.meta.url);
const SYNC_FILES = existsSync(SYNC_DIR)
	? readdirSync(SYNC_DIR).filter((f) => /-active-\d+\.json$/.test(f)).sort().map((f) => `sync/${f}`)
	: [];
const FILES = ["first-job.json", "raw-jobs.json", "raw-fresh.json", ...SYNC_FILES];

const payload = await getPayload({ config });

// 1. Read every saved file; later files win, so the freshest copy of a job is used.
const byId = new Map<number, Record<string, unknown>>();
for (const name of FILES) {
	const file = new URL(`../data/${name}`, import.meta.url);
	if (!existsSync(file)) continue;
	const jobs = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>[];
	for (const job of jobs) byId.set(job.id as number, job);
	console.log(`Read data/${name}: ${jobs.length} jobs`);
}

// 2. sourceIds already in the database.
const existing = await payload.find({
	collection: "jobs",
	pagination: false,
	depth: 0,
	select: { sourceId: true },
});
const have = new Set(existing.docs.map((d) => Number(d.sourceId)));

// 3. Create the new ones.
let created = 0;
let skipped = 0;
let rejected = 0;
for (const job of byId.values()) {
	const row = toRow(job);
	if (!row) {
		rejected++;
		continue;
	}
	if (have.has(Number(row.id))) {
		skipped++;
		continue;
	}
	const data = toJobData(row) as Omit<Job, "id" | "createdAt" | "updatedAt">;
	await payload.create({ collection: "jobs", data, depth: 0 });
	created++;
}
console.log(`Unique jobs in files: ${byId.size}. Created: ${created}. Already there: ${skipped}. Rejected by toRow: ${rejected}.`);

// 4. Summary of open jobs, to compare with the Day 2 numbers.
const total = await payload.count({ collection: "jobs", where: { status: { equals: "open" } } });
console.log(`Open jobs in Payload: ${total.totalDocs}`);

// 5. Clear the site's Redis cache, after all writes are committed (lib/cache.ts; no-op without REDIS_URL).
if (await bumpCacheVersion()) console.log("Site cache cleared (new cache version).");
process.exit(0);
