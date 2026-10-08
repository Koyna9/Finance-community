// Fetch finance jobs from fantastic.jobs and SAVE the raw response (CLAUDE.md section 6).
// Loading the saved files into the database is a separate step: npm run load-jobs (scripts/load-jobs.ts).
//
//   node scripts/backfill.mjs --test        5 newest jobs           -> data/raw-jobs.json
//   node scripts/backfill.mjs               dev backfill (capped)   -> data/raw-jobs.json
//                                           continues with jobs posted BEFORE the oldest saved one
//   node scripts/backfill.mjs --fresh=370   Day 6 fresh load        -> data/raw-fresh.json
//                                           (N is worked out on Day 6 and approved first)

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { apiGet, baseFilters, lastCredits } from "./fantastic.mjs";

const TEST_SIZE = 5;
const BACKFILL_MAX = 100;
const MIN_CREDITS_RESERVE = 10;
const PAGE_LIMIT = 1000; // API maximum; few large pages save request credits

const args = process.argv.slice(2);
const freshArg = args.find((a) => a.startsWith("--fresh="));
const mode = args.includes("--test") ? "test" : freshArg ? "fresh" : "dev";
const cap = mode === "test" ? TEST_SIZE : mode === "fresh" ? Number(freshArg.split("=")[1]) : BACKFILL_MAX;
if (!Number.isInteger(cap) || cap < 1) throw new Error(`Bad cap: ${cap}`);

const dataDir = new URL("../data/", import.meta.url);
const outFile = new URL(mode === "fresh" ? "raw-fresh.json" : "raw-jobs.json", dataDir);
mkdirSync(dataDir, { recursive: true });

const readJobs = (file) => (existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : []);
const saved = readJobs(outFile);
// Every job already saved in ANY data/ file (incl. the nightly sync's data/sync/*-active-*.json).
const syncDir = new URL("sync/", dataDir);
const syncFiles = existsSync(syncDir)
  ? readdirSync(syncDir).filter((f) => f.includes("-active-")).map((f) => new URL(f, syncDir))
  : [];
const knownIds = new Set(
  [
    ...saved,
    ...readJobs(new URL("first-job.json", dataDir)),
    ...readJobs(new URL("raw-jobs.json", dataDir)),
    ...readJobs(new URL("raw-fresh.json", dataDir)),
    ...syncFiles.flatMap(readJobs),
  ].map((j) => j.id)
);
console.log(`Already saved (skipped if returned again): ${knownIds.size} jobs`);

const filters = { ...baseFilters(), time_frame: "7d" };
// Dev backfill: only jobs older than everything already saved, so we never pay twice.
if (mode === "dev" && saved.length) {
  filters.date_posted_lt = saved.map((j) => j.date_posted).sort()[0];
}

const startedAt = new Date().toISOString();
console.log(`Mode: ${mode}, cap ${cap}, reserve ${MIN_CREDITS_RESERVE}, saving to data/${outFile.pathname.split("/").pop()}`);
if (filters.date_posted_lt) console.log(`Only jobs posted before ${filters.date_posted_lt}`);

// Credits left, from the last API response (data/credits.json) — no extra call needed.
const known = lastCredits();
if (!known) throw new Error("data/credits.json missing: run scripts/check-credits.mjs once first");
let remaining = Number(known["x-api-jobs-remaining"]);
let requestsLeft = Number(known["x-api-requests-remaining"]);
console.log(`Jobs credits left: ${remaining}. Request credits left: ${requestsLeft} (as of ${known.saved_at})`);

let fetched = 0;
let offset = 0;
let stopReason = null;

while (!stopReason) {
  const affordable = remaining - MIN_CREDITS_RESERVE;
  const limit = Math.min(cap - fetched, affordable, PAGE_LIMIT);
  if (limit <= 0) {
    stopReason = fetched >= cap ? `cap ${cap} reached` : `credit reserve ${MIN_CREDITS_RESERVE} reached`;
    break;
  }

  const res = await apiGet("/active-ats", {
    ...filters,
    limit: String(limit),
    offset: String(offset),
    description_format: "text",
    include_basic_organization_details: "true",
  });
  if (res.status !== 200) {
    stopReason = `API error HTTP ${res.status}: ${JSON.stringify(res.body).slice(0, 300)}`;
    break;
  }

  const page = res.body;
  remaining = Number(res.credits["x-api-jobs-remaining"]);
  requestsLeft = Number(res.credits["x-api-requests-remaining"]);
  fetched += page.length;
  offset += page.length;

  // Save BEFORE any processing (skip ids we already have).
  const fresh = page.filter((j) => !knownIds.has(j.id));
  fresh.forEach((j) => knownIds.add(j.id));
  saved.push(...fresh);
  writeFileSync(outFile, JSON.stringify(saved, null, 2));
  console.log(`Page: ${page.length} jobs (${fresh.length} new). Total saved: ${saved.length}. Credits left: ${remaining}`);

  if (page.length < limit) stopReason = "no more matching jobs";
}

console.log(`\nStopped: ${stopReason}`);
console.log(`Started at (UTC): ${startedAt}`);
console.log(`Fetched this run: ${fetched}. Jobs credits left: ${remaining}. Request credits left: ${requestsLeft}`);
