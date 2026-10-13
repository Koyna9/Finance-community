// Sorting rules (CLAUDE.md section 8). Used by scripts/backfill.mjs AND the sync worker.
// toRow(apiJob) turns one fantastic.jobs job into one `jobs` row, or returns null to skip it.

import { normalizeState, STATE_CODES } from "./states.js";

// ---- Values to confirm against real data (Day 2) -------------------------------------------

// ai_work_arrangement values that mean "fully remote".
export const REMOTE_VALUES = ["Remote Solely"];

// Titles matching any of these are not finance jobs, even if a category rule matches.
// Filled from real data (CLAUDE.md section 8, rule 3).
export const EXCLUDE = [];

// ---- Categories (order matters: first match wins) -------------------------------------------
// Keep in sync with the `title_advanced` filter in CLAUDE.md section 6.

export const CATEGORIES = [
  { key: "leadership", label: "Finance Leadership",
    re: /\b(cfo|chief financial|vp,? finance|head of finance|finance director)\b/i },
  { key: "tax", label: "Tax",
    re: /\b(tax|transfer pricing)\b/i },
  { key: "audit", label: "Audit",
    re: /\baudit\w*/i },
  { key: "treasury", label: "Treasury",
    re: /\b(treasury|cash management)\b/i },
  { key: "risk-compliance", label: "Risk & Compliance",
    re: /\b(risk|compliance|aml|kyc)\b/i },
  { key: "investment", label: "Investment & Corporate Development",
    re: /(\binvestments?\b|\bm&a\b|\bcorporate development\b|\bprivate equity\b|\bequity research\b|\bvaluation\b)/i },
  { key: "fpa", label: "FP&A",
    re: /(fp&a|financial planning|financial analyst|finance analyst|business finance|finance manager)/i },
  { key: "accounting", label: "Accounting",
    re: /(accountant|accounting|accounts payable|accounts receivable|controller|bookkeep|payroll|billing)/i },
];

export function categoryFor(title) {
  if (EXCLUDE.some((re) => re.test(title))) return null;
  return CATEGORIES.find((c) => c.re.test(title))?.key ?? null;
}

// ---- Level ---------------------------------------------------------------------------------

const LEAD_RE = /\b(cfo|chief|vp|vice president|head|director|partner)\b/i;
const SENIOR_RE = /\b(senior|sr|lead|principal|avp)\b/i;
const ENTRY_RE = /\b(intern|trainee|graduate|junior|jr|entry)\b/i;

export function levelFor(title, experience) {
  // "Business partner" is not a lead title (e.g. "Finance Business Partner").
  const t = title.replace(/\bbusiness partner\b/gi, " ");
  if (LEAD_RE.test(t)) return "lead";
  if (SENIOR_RE.test(t)) return "senior";
  if (ENTRY_RE.test(t)) return "entry";
  if (experience === "10+") return "lead";
  if (experience === "5-10") return "senior";
  if (experience === "0-2") return "entry";
  return "mid";
}

// ---- Clean title ---------------------------------------------------------------------------

// Words kept in capitals when title-casing.
const ABBREVIATIONS = new Set([
  "FP&A", "CFO", "CPA", "VP", "AVP", "AP", "AR", "M&A", "AML", "KYC", "SEC", "GL", "US",
  "IT", "BSA", "AWM",
]);
const SMALL_WORDS = new Set(["of", "and", "for", "to", "in", "the", "a", "an", "on", "at", "&"]);

function titleCaseWord(word, isFirst) {
  // "Full-Charge" and "AP/AR": title-case each piece separately.
  if (/[-/]/.test(word) && !ABBREVIATIONS.has(word.toUpperCase())) {
    return word.split(/([-/])/).map((p) => (/[-/]/.test(p) ? p : titleCaseWord(p, true))).join("");
  }
  const upper = word.toUpperCase();
  if (ABBREVIATIONS.has(upper)) return upper;
  const lower = word.toLowerCase();
  if (!isFirst && SMALL_WORDS.has(lower)) return lower;
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

const SENIORITY_WORDS_RE = /\b(senior|sr|jr|junior)\b\.?|\b(i|ii|iii|iv)\b/gi;
const hasFinanceKeyword = (text) => CATEGORIES.some((c) => c.re.test(text));

export function cleanTitle(title) {
  // Split at " - " (hyphen WITH spaces), ",", "(", "|", "–" or "—" and keep the first part,
  // unless it has no finance keyword: then keep the first part that does. If the first part
  // is just a short role ("Senior Manager"), join it on: "Senior Manager, Accounting" ->
  // "Accounting Manager".
  const parts = String(title).split(/ - |,|\(|\||–|—/).map((p) => p.replace(/[()]/g, "").trim());
  let t = parts.find(hasFinanceKeyword) ?? parts[0];
  if (t !== parts[0]) {
    const roleWords = parts[0].replace(SENIORITY_WORDS_RE, " ").trim().split(/\s+/).filter(Boolean);
    if (roleWords.length >= 1 && roleWords.length <= 2) t = `${t} ${roleWords.join(" ")}`;
  }
  t = t.replace(SENIORITY_WORDS_RE, " ");
  t = t.replace(/\b(19|20)\d{2}\b/g, " "); // "Summer 2027 Tax Internship" -> "Summer Tax Internship"
  t = t.replace(/\s+/g, " ").trim();
  if (!t) return String(title).trim();
  return t.split(" ").map((w, i) => titleCaseWord(w, i === 0)).join(" ");
}

// ---- Pay -----------------------------------------------------------------------------------

const PER_YEAR = { YEAR: 1, MONTH: 12, WEEK: 52, DAY: 260, HOUR: 2080 };

export function yearlyPay(job) {
  if (job.ai_salary_currency !== "USD") return { pay_min: null, pay_max: null };
  const factor = PER_YEAR[String(job.ai_salary_unit_text ?? "").toUpperCase()];
  if (!factor) return { pay_min: null, pay_max: null };
  const toYear = (v) => (typeof v === "number" && v > 0 ? Math.round(v * factor) : null);
  let min = toYear(job.ai_salary_min_value);
  let max = toYear(job.ai_salary_max_value);
  if (min === null && max === null) {
    min = max = toYear(job.ai_salary_value);
  }
  return { pay_min: min, pay_max: max };
}

// Pay as the employer states it (same figures as yearlyPay, before converting to yearly):
// "$25–$32 an hour" stays per hour on the site and in JobPosting (SEO audit 2026-10-12, 4.5).
export function statedPay(job) {
  const none = { pay_unit: null, pay_stated_min: null, pay_stated_max: null };
  if (job.ai_salary_currency !== "USD") return none;
  const unit = String(job.ai_salary_unit_text ?? "").toUpperCase();
  if (!PER_YEAR[unit]) return none;
  const ok = (v) => (typeof v === "number" && v > 0 ? v : null);
  let min = ok(job.ai_salary_min_value);
  let max = ok(job.ai_salary_max_value);
  if (min === null && max === null) min = max = ok(job.ai_salary_value);
  if (min === null && max === null) return none;
  return { pay_unit: unit, pay_stated_min: min, pay_stated_max: max };
}

// ---- Employment type and company website -----------------------------------------------------

// Google for Jobs employmentType values (same as the API's ai_employment_type).
export const EMPLOYMENT_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACTOR", "TEMPORARY", "INTERN", "OTHER"];

export function employmentTypes(job) {
  const values = Array.isArray(job.ai_employment_type) ? job.ai_employment_type : [];
  return [...new Set(values.map((v) => String(v).toUpperCase()).filter((v) => EMPLOYMENT_TYPES.includes(v)))];
}

// The company's own website (from its LinkedIn page), as a clean absolute URL, or null.
// Fixes "http://https://example.org" and adds https:// to "www.example.com".
export function companyWebsite(job) {
  let text = String(job.org_linkedin_website ?? "").trim();
  if (!text) return null;
  text = text.replace(/^https?:\/\/(?=https?:\/\/)/i, "");
  if (!/^https?:\/\//i.test(text)) text = `https://${text}`;
  try {
    const url = new URL(text);
    if (!/^https?:$/.test(url.protocol) || !/\.[a-z]{2,}$/i.test(url.hostname) || /linkedin\.com$/i.test(url.hostname)) return null;
    return url.href;
  } catch {
    return null;
  }
}

// ---- Company name --------------------------------------------------------------------------

const STATE_CODE_SET = new Set(Object.values(STATE_CODES));

// Company names arrive with notes or branch details glued on (SEO audit 2026-10-12, 3.5):
//   "No relevant LinkedIn company found.PIPESTONE"       -> "PIPESTONE"
//   "Jackson Hewitt - 1558" (franchise/store number)     -> "Jackson Hewitt"
//   "Kirby-Smith Machinery, Inc. - Oklahoma City, OK"    -> "Kirby-Smith Machinery, Inc."
// Real names with a dash stay ("DGI - Menard INC", "ServiceMaster Restore 10188 - Doral").
export function cleanCompany(name) {
  let n = String(name ?? "").replace(/no relevant linkedin company found\.?/gi, "").replace(/\s+/g, " ").trim();
  n = n.replace(/ - \d+$/, "");
  n = n.replace(/ - [A-Za-z][A-Za-z .'-]*, ([A-Z]{2})$/, (match, code) => (STATE_CODE_SET.has(code) ? "" : match));
  return n.trim() || null;
}

// ---- Slugs ---------------------------------------------------------------------------------

export function slugify(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/['’]/g, "") // "Children's" -> "childrens"
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---- toRow ---------------------------------------------------------------------------------

// toRow() result -> a Payload `jobs` document (camelCase fields, CLAUDE.md section 7).
// Used by scripts/load-jobs.ts and jobs/sync.ts.
export function toJobData(row) {
  // date_posted arrives without a time zone ("2026-10-07T02:48:51"); it is UTC.
  const posted = row.date_posted
    ? new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(row.date_posted) ? row.date_posted : `${row.date_posted}Z`)
    : null;
  return {
    sourceId: row.id,
    slug: row.slug,
    title: row.title,
    cleanTitle: row.clean_title,
    titleSlug: row.title_slug,
    company: row.company,
    companySlug: row.company_slug,
    logo: row.logo,
    companyIndustry: row.company_industry,
    companySize: row.company_size,
    category: row.category,
    level: row.level,
    state: row.state,
    stateSlug: row.state_slug,
    city: row.city,
    citySlug: row.city_slug,
    isRemote: Boolean(row.is_remote),
    workArrangement: row.work_arrangement,
    payMin: row.pay_min,
    payMax: row.pay_max,
    payUnit: row.pay_unit,
    payStatedMin: row.pay_stated_min,
    payStatedMax: row.pay_stated_max,
    employmentType: row.employment_type,
    companyWebsite: row.company_website,
    summary: row.summary,
    requirements: row.requirements,
    description: row.description,
    applyUrl: row.apply_url,
    datePosted: posted && !Number.isNaN(posted.getTime()) ? posted.toISOString() : null,
    status: "open",
    hidden: false,
  };
}

export function toRow(job) {
  // 1. Country
  if (job?.countries_derived?.[0] !== "United States") return null;

  // 3. Category (no match = skip)
  const title = String(job.title ?? "").trim();
  const category = categoryFor(title);
  if (!category) return null;

  // 2. Place. A city only counts when we also know its (valid US) state,
  //    because city pages live under their state: /fpa-jobs/texas/austin.
  const state = normalizeState(job.regions_derived?.[0]);
  const city = state && job.cities_derived?.[0] ? String(job.cities_derived[0]).trim() : null;
  const is_remote = REMOTE_VALUES.includes(job.ai_work_arrangement) ? 1 : 0;

  const clean_title = cleanTitle(title);
  const title_slug = slugify(clean_title);
  // Notes, franchise numbers and branch locations glued to the name are removed (cleanCompany).
  const company = cleanCompany(job.organization);
  const company_slug = company ? slugify(company) : null;
  const state_slug = state ? slugify(state) : null;
  const city_slug = city ? slugify(city) : null;

  const slug = [company_slug, title_slug, city_slug ?? state_slug, job.id]
    .filter(Boolean)
    .join("-");

  return {
    id: job.id,
    slug,
    title,
    clean_title,
    title_slug,
    company,
    company_slug,
    logo: job.org_logo_permalink ?? null,
    company_industry: job.org_linkedin_industry ?? null,
    company_size: job.org_linkedin_size ?? null,
    company_website: companyWebsite(job),
    category,
    level: levelFor(title, job.ai_experience_level),
    state,
    state_slug,
    city,
    city_slug,
    is_remote,
    work_arrangement: job.ai_work_arrangement ?? null,
    ...yearlyPay(job),
    ...statedPay(job),
    employment_type: employmentTypes(job),
    summary: job.ai_core_responsibilities ?? null,
    requirements: job.ai_requirements_summary ?? null,
    description: job.description_text ?? null,
    apply_url: job.url ?? null,
    date_posted: job.date_posted ?? null,
    status: "open",
  };
}
