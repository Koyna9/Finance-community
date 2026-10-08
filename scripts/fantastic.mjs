// Small helper for calling the fantastic.jobs API from local scripts.
// Reads FANTASTIC_JOBS_KEY from the environment or .env.local and never prints it.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const CREDITS_FILE = new URL("../data/credits.json", import.meta.url);

// Latest credit headers seen (saved after every call), or null if none yet.
export function lastCredits() {
  return existsSync(CREDITS_FILE) ? JSON.parse(readFileSync(CREDITS_FILE, "utf8")) : null;
}

export const BASE_URL = "https://data.fantastic.jobs/v1";

// Must match the category regexes in shared/rules.js (CLAUDE.md section 6).
export const TITLE_ADVANCED =
  "cfo | 'chief financial' | 'vp finance' | 'head of finance' | 'finance director' | tax | " +
  "'transfer pricing' | audit:* | treasury | 'cash management' | risk | compliance | aml | kyc | " +
  "investment:* | 'm&a' | 'corporate development' | 'private equity' | 'equity research' | " +
  "valuation | 'fp&a' | 'financial planning' | 'financial analyst' | 'finance analyst' | " +
  "'business finance' | 'finance manager' | accountant | accounting | 'accounts payable' | " +
  "'accounts receivable' | controller | bookkeep:* | payroll | billing";

// Filters sent on every active-ats / active-ats-count call (CLAUDE.md section 6).
export function baseFilters() {
  return {
    location: '"United States"',
    ai_taxonomies_a_primary: "Finance & Accounting",
    title_advanced: TITLE_ADVANCED,
    organization_agency: "exclude",
  };
}

// The key comes from the environment (TrueFoundry, or a script started with it set),
// otherwise from .env.local on my laptop.
export function loadKey() {
  if (process.env.FANTASTIC_JOBS_KEY) return process.env.FANTASTIC_JOBS_KEY.trim();
  const file = new URL("../.env.local", import.meta.url);
  const vars = existsSync(file) ? readFileSync(file, "utf8") : "";
  const match = vars.match(/^FANTASTIC_JOBS_KEY=(.+)$/m);
  if (!match) throw new Error("FANTASTIC_JOBS_KEY missing from .env.local");
  return match[1].trim();
}

// GET an endpoint. Returns { status, body, credits } where credits holds the x-api-* headers.
export async function apiGet(path, params) {
  const url = `${BASE_URL}${path}?${new URLSearchParams(params)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${loadKey()}` } });
  const credits = {};
  for (const [name, value] of res.headers) {
    if (name.startsWith("x-api-")) credits[name] = value;
  }
  if (credits["x-api-jobs-remaining"]) {
    mkdirSync(new URL("../data/", import.meta.url), { recursive: true });
    writeFileSync(CREDITS_FILE, JSON.stringify({ ...credits, saved_at: new Date().toISOString() }, null, 2));
  }
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body, credits };
}
