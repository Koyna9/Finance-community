// Load the saved raw API files into Payload's `jobs` collection (CLAUDE.md sections 5 and 6).
// NO API calls: it only reads data/*.json. Jobs that already exist (same sourceId) are not
// re-created, so admin edits are never overwritten and the script is safe to run again.
// Existing jobs only get fields added after they were loaded (employmentType, companyWebsite, stated
// pay; SEO audit 2026-10-12), and only while those fields are still empty. Company names on every
// job in the database get the current clean-up (cleanCompany: "Jackson Hewitt - 1558" -> "Jackson
// Hewitt"); job slugs (page addresses) never change.
//
//   npm run load-jobs          (= payload run scripts/load-jobs.ts; reads .env.local)

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { getPayload } from "payload";
import { bumpCacheVersion } from "../lib/cache";
import config from "../payload.config";
import type { Job } from "../payload-types";
import { cleanCompany, slugify, toJobData, toRow } from "../shared/rules.js";

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

// 2. Jobs already in the database (by sourceId), with the fields step 3 may fill in.
const existing = await payload.find({
	collection: "jobs",
	pagination: false,
	depth: 0,
	select: {
		sourceId: true,
		company: true,
		payMin: true,
		payMax: true,
		payUnit: true,
		employmentType: true,
		companyWebsite: true,
	},
});
const have = new Map(existing.docs.map((d) => [Number(d.sourceId), d as Job]));

// Newer fields for a job that is already there: each only when still empty. Stated pay only when
// the yearly pay is still what the rules give (so pay an admin corrected is left alone).
function fillIn(doc: Job, data: Partial<Job>): Partial<Job> {
	const update: Partial<Job> = {};
	if (!doc.employmentType?.length && data.employmentType?.length) update.employmentType = data.employmentType;
	if (!doc.companyWebsite && data.companyWebsite) update.companyWebsite = data.companyWebsite;
	const samePay = (doc.payMin ?? null) === (data.payMin ?? null) && (doc.payMax ?? null) === (data.payMax ?? null);
	if (!doc.payUnit && data.payUnit && samePay) {
		update.payUnit = data.payUnit;
		update.payStatedMin = data.payStatedMin;
		update.payStatedMax = data.payStatedMax;
	}
	return update;
}

// 3. Create the new ones; fill in newer fields on existing ones.
let created = 0;
let skipped = 0;
let filled = 0;
let rejected = 0;
for (const job of byId.values()) {
	const row = toRow(job);
	if (!row) {
		rejected++;
		continue;
	}
	const data = toJobData(row) as Omit<Job, "id" | "createdAt" | "updatedAt">;
	const doc = have.get(Number(row.id));
	if (doc) {
		skipped++;
		const update = fillIn(doc, data);
		if (Object.keys(update).length > 0) {
			await payload.update({ collection: "jobs", id: doc.id, data: update, depth: 0 });
			filled++;
		}
		continue;
	}
	await payload.create({ collection: "jobs", data, depth: 0 });
	created++;
}
console.log(
	`Unique jobs in files: ${byId.size}. Created: ${created}. Already there: ${skipped} (newer fields filled in: ${filled}). Rejected by toRow: ${rejected}.`,
);

// 4. Company-name clean-up on jobs that were already in the database (also those without a saved
//    file, e.g. added by the live sync). Only the name and its company page address change.
let renamed = 0;
for (const doc of existing.docs as Job[]) {
	const cleaned = doc.company ? cleanCompany(doc.company) : null;
	if (!cleaned || cleaned === doc.company) continue;
	await payload.update({ collection: "jobs", id: doc.id, data: { company: cleaned, companySlug: slugify(cleaned) }, depth: 0 });
	renamed++;
}
console.log(`Company names cleaned up: ${renamed}.`);

// 5. Summary of open jobs, to compare with the Day 2 numbers.
const total = await payload.count({ collection: "jobs", where: { status: { equals: "open" } } });
console.log(`Open jobs in Payload: ${total.totalDocs}`);

// 6. Clear the site's Redis cache, after all writes are committed (lib/cache.ts; no-op without REDIS_URL).
if (await bumpCacheVersion()) console.log("Site cache cleared (new cache version).");
process.exit(0);
