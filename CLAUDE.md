# CLAUDE.md — Finance Job Board (project brief)

Read this whole file before doing anything. It is the single source of truth for this project.
If something here conflicts with a request, ask me before deviating.

## 1. About me and how to work with me

- I am a beginner. Explain what you are doing in simple words, one step at a time.
- Before running any command that costs money, deploys, deletes data, or calls the fantastic.jobs
  API with more than 20 jobs, tell me what it will do and wait for my "yes".
- Work in small steps. After each step, tell me how to check it worked (URL to open, command to run).
- Commit to git after every working step with a clear message.
- At the end of each day's work, update the "Progress" checklist in section 13 of this file.
- Never put API keys or secrets in code, in git, or in any file except `.env.local` (git-ignored)
  and TrueFoundry secrets.

## 2. What we are building

A simple, niche job board for **finance jobs in the United States only**.
Same purpose as financeroles.co (employer-sourced finance jobs, apply on the employer's site),
but simpler, with its own unique look. Do NOT copy financeroles.co's or growthroles.com's design or text.

Visitors browse jobs by: role category, experience level, job title, **US state and US city**,
company, and pay per role. **Every browse combination is its own page with its own URL**
(e.g. `/fpa-jobs/california`), never a query-string filter like `?state=...`. This is for SEO:
each page can rank in Google on its own. There is NO site-wide search box (only the in-page filter boxes on /locations, /titles and
/companies, agreed 2026-10-08), NO visitor accounts, NO AI features in week 1. (Admin logins for the
Payload CMS admin panel are the only accounts.)

## 3. Order of work: local first, then live on TrueFoundry

**Stack change (2026-10-07):** Cloudflare is no longer used. The site now runs on **Payload CMS +
PostgreSQL**, hosted on **TrueFoundry** (company decision). Work for this move was done on git branch
`move-to-payload`, which is now `main` (renamed 2026-10-08; the old Cloudflare `main` is `old-main`).
Days 1–3 were built on Cloudflare D1 locally; Day 4A switches them over.

- **Day 4A: switch to Payload + PostgreSQL on my laptop** (section 4). The 104 saved jobs are
  re-loaded from `data/*.json` with 0 API credits; Home and Job pages must look and work exactly
  as before.
- **Days 4–5: build the remaining pages and the nightly sync script, all on `localhost`.**
  Do not deploy anything before Day 6.
- **Fresh load: on 2026-10-12 at the latest** (or right before go-live if that comes first).
  It only downloads jobs into `data/raw-fresh.json` on my laptop and does NOT need TrueFoundry.
  **Hard deadline: it must be done before the fantastic.jobs trial ends on 2026-10-13 11:20 UTC.**
  After that, no new jobs can be fetched.
- **Day 6: go live on TrueFoundry** (my manager gives me a new TrueFoundry workspace for this site).
- **Day 7: domain, design polish, demo.**
- fantastic.jobs is called from my laptop from Day 2, so the credit budget (section 6) applies throughout.

## 4. Tech stack (do not change without asking)

| Part | Choice |
|---|---|
| Website | Next.js (App Router) + TypeScript + Tailwind CSS |
| CMS + admin | **Payload CMS 3** (MIT, open source), installed INSIDE the same Next.js app; admin panel at `/admin` |
| Database | **PostgreSQL 17** through `@payloadcms/db-postgres`. Locally: Docker (OrbStack), `docker-compose.yml`, port 5432. Online: a PostgreSQL for TrueFoundry (managed cloud DB or a container in the workspace — confirm with my manager before Day 6) |
| Cache | **Redis** (shared cache for page data, `lib/cache.ts`, cache-aside, 15 minutes per item, keys under `fc:`). Locally: `redis:7.2-alpine` in `docker-compose.yml`, port 6379, password required. Online: a **managed Redis on the same cloud as TrueFoundry** (probably AWS ElastiCache or GCP Memorystore): Redis OSS 7.x or Valkey 7.2/8, one primary, cluster mode disabled (not ElastiCache Serverless), smallest node (well under 100 MB needed), `maxmemory-policy volatile-lru`, no persistence/backups, TLS on, password on, private network only (reachable only from the TrueFoundry cluster) |
| Nightly job | Node script `jobs/sync.ts`, run locally with `npm run sync`; online as a **TrueFoundry Job with a schedule trigger** `0 2 * * *` (timezone UTC) |
| Hosting (from Day 6) | **TrueFoundry**: one Service (the Next.js + Payload app, from a Docker image) + one scheduled Job (same image, runs the sync command) |
| Settings + secrets | `.env.local` locally (`DATABASE_URL`, `PAYLOAD_SECRET`, `FANTASTIC_JOBS_KEY`, `MIN_JOBS_PER_PAGE=1`, `SITE_URL=http://localhost:3000`, `REDIS_PASSWORD`, `REDIS_URL`); TrueFoundry secrets / environment variables online (`MIN_JOBS_PER_PAGE=3`, `SITE_URL` = the live domain, `REDIS_URL=rediss://:<password>@<host>:<port>` and, if the cloud's TLS needs it (GCP), `REDIS_CA_CERT` = its CA certificate; both for the site Service AND the sync Job) |
| Domain | Company domain/DNS pointed at the TrueFoundry service (Day 7) |
| Local tools | Node 24, OrbStack (Docker 29, Compose 5) |

Rules:
- Keep it simple. No extra UI libraries, no state management libraries.
- **How pages read data:** pages only call functions in `lib/db.ts` (keep their names and return
  shapes, so pages barely change). Inside `lib/db.ts`, use Payload's Local API
  (`getPayload({ config })`, then `payload.find` / `findByID` / `count`) for normal lists and
  single jobs. For counts and summaries (jobs per state/city/title/company, pay low/median/high),
  use plain SQL through Payload's own PostgreSQL connection. All SQL lives in `lib/db.ts`.
- **Redis cache (added 2026-10-08):** every read function in `lib/db.ts` goes through `cached()`
  from `lib/cache.ts` (Redis first; on a miss read PostgreSQL and save for 15 minutes). Its key must
  include every input that changes the result (incl. `MIN_JOBS_PER_PAGE`). Any change to jobs or
  category pages clears it at once by starting a new cache version: Payload hooks on Jobs and
  CategoryPages (twice: right away and 3 s later, because Payload runs hooks before the database
  commit), and the end of `jobs/sync.ts` and `scripts/load-jobs.ts`. Fail-open: if Redis is missing
  (`REDIS_URL` empty), down or slow (250 ms), pages read PostgreSQL directly and a `[cache]`
  warning is logged. `/admin`, `/api` and the scripts never read through the cache. When a
  `lib/db.ts` function changes its return shape, raise `SCHEMA` in `lib/cache.ts`.
- **Payload owns the database tables.** They come from the collection configs (section 7). Change
  them only by editing a collection and creating a Payload migration (`npx payload migrate:create`,
  then `npx payload migrate`); never hand-edit tables. Run migrations locally before committing.
- **Before installing Payload, check that the current Payload release supports this project's
  Next.js version** (its package peer dependencies and docs). If it doesn't, ask me before moving
  Next.js to a supported version.
- Every page that shows jobs reads fresh data: `export const dynamic = "force-dynamic"` — until Day 6,
  when public pages switch to time-based caching (section 9, SEO rule 7).
- Pages show only jobs with `status = 'open'` AND `hidden = false`.
- `/admin` is for us only: not linked from the site, `noindex`, login required. The public site
  never writes to the database; only the admin panel, the load script and the sync job do.
- This is Next.js 16, newer than most training data: before writing Next.js code, check the
  matching guide in `node_modules/next/dist/docs/` and heed deprecation notices.
  (`agentRules: false` in `next.config.ts` stops `next dev` from writing this advice into CLAUDE.md.)
- PostgreSQL: start `docker compose up -d`, stop `docker compose stop`, status `docker compose ps`.
  OrbStack must be open. **Never run `docker compose down -v`** (it deletes the data).
  The same commands start/stop the local Redis (service `redis`); it keeps nothing on disk.

## 5. Folder structure

```
finance-jobs/
  CLAUDE.md, DAY_PROMPTS.md
  docker-compose.yml        local PostgreSQL 17 (service "postgres", named volume postgres-data)
                            + local Redis 7.2 cache (service "redis", no volume)
  .env.local                DATABASE_URL, PAYLOAD_SECRET, FANTASTIC_JOBS_KEY, MIN_JOBS_PER_PAGE=1,
                            REDIS_PASSWORD, REDIS_URL (git-ignored)
  .env.example              every setting name with placeholder values (committed; copy to .env.local)
  Dockerfile                builds the app image for TrueFoundry (Day 6)
  payload.config.ts         Payload setup: Postgres adapter, collections, globals, admin
  payload-types.ts          generated by `npm run generate:types` after changing collections (committed)
  collections/              Jobs.ts, SyncRuns.ts, Users.ts, CategoryPages.ts (section 7)
  globals/SiteText.ts       editable home headline/subline + default SEO text (section 7)
  migrations/               Payload migrations (committed)
  data/first-job.json       the 1-job credit check from Day 2; kept and loaded
  data/raw-jobs.json        dev jobs: 5-job test + dev backfill; reuse, don't re-fetch
  data/raw-fresh.json       fresh load; reuse, don't re-fetch
  data/credits.json         latest x-api-* credit headers, written after every API call
  data/sync/                raw responses saved by each sync run (active + expired)
                            All of data/ is committed (agreed 2026-10-08; no secrets in it).
  shared/rules.js           category, level, title, place, pay rules — used by the load script AND sync
  shared/states.js          US state name -> 2-letter code (incl. District of Columbia -> DC)
  scripts/fantastic.mjs     API helper: reads the key from .env.local, shared filters (title_advanced)
  scripts/check-credits.mjs the Day 2 one-job credit check
  scripts/test-rules.mjs    tiny test of rules.js on fake jobs
  scripts/backfill.mjs      fetches jobs (capped) and saves raw files: --test (5), dev (BACKFILL_MAX), --fresh
  scripts/load-jobs.ts      saved raw files -> toRow -> Payload Jobs (create new by sourceId; no API calls)
                            (replaces scripts/make-seed.mjs)
  jobs/sync.ts              nightly sync (section 10); `npm run sync`
  design/DESIGN.md          approved UI design (section 11) + design/mockups/ (reference only)
  lib/site.ts               SITE_NAME ("finance-community") and site-wide constants
  lib/payload.ts            one shared getPayload() helper (`payloadClient()`)
  lib/fonts.ts              IBM Plex fonts (next/font), shared by the site layout and the global 404
  lib/db.ts                 all data reads used by pages (Payload Local API + SQL for summaries)
  lib/cache.ts              Redis cache used only by lib/db.ts reads (`cached`) + `bumpCacheVersion`
                            for the Jobs/CategoryPages hooks and the end of sync.ts / load-jobs.ts
  lib/format.ts             pay (USD) / date / label helpers
  lib/seo.ts                page title + meta description builders
  components/               one file per DESIGN.md component: Header, Footer, Breadcrumbs,
                            CompanyTile, Chip, PayChip, JobCard, ApplyButton, SidebarBox, ...
  components/PlaceLinks.tsx "Browse by state" / "Browse by city" link lists
  app/globals.css           design tokens (Tailwind theme)
  app/(frontend)/           the public site pages (section 9) + its root layout and not-found
  app/(payload)/            Payload's admin + API routes (created by Payload; don't edit by hand)
  app/global-not-found.tsx  404 for URLs that match no route (two root layouts → needed)
```

Removed in Day 4A (Cloudflare): `wrangler.jsonc`, `.dev.vars` (its values move to `.env.local`),
`open-next.config.ts`, `cloudflare-env.d.ts`, `public/_headers`, `db/schema.sql`, `db/seed.sql`,
`scripts/make-seed.mjs`, the `.wrangler/` folder, `sync-worker/` (never built), the
`@opennextjs/cloudflare` and `wrangler` packages and their `package.json` scripts.

## 6. Data source: fantastic.jobs API and the free-trial budget

- Base URL: `https://data.fantastic.jobs/v1` — Auth header: `Authorization: Bearer <FANTASTIC_JOBS_KEY>`
- Docs: https://developer.fantastic.jobs/api/new-jobs
- **Before the first API call, check every parameter name and value below against the docs**
  (they may differ, e.g. `location` vs `location_filter`). Fix this section if they differ,
  and note the change in the Notes log.

Endpoints:
1. `GET /active-ats` — new jobs. Parameters we always send:
   - `time_frame`: `7d` for the one-time backfill, `24h` for the nightly sync
   - `location`: `"United States"` (with the quotes)
   - `ai_taxonomies_a_primary`: `Finance & Accounting`
   - `title_advanced`: the finance keyword filter below (we only pay for jobs we keep)
   - `organization_agency`: `exclude`
   - `description_format`: `text`
   - `include_basic_organization_details`: `true`
   - `limit` (max 1000 per call) and `offset`, paging until a page returns fewer than `limit`.
     Default order is `date_posted` newest first, so offset paging takes the newest jobs first.
     (Every call also uses 1 of the small "request credits" allowance, so prefer few large pages.)
   - `title_advanced` value (must match the category rules in section 8; verified on Day 2,
     `'fp&a'` and `'m&a'` work inside single quotes; lives in `scripts/fantastic.mjs`):
     `cfo | 'chief financial' | 'vp finance' | 'head of finance' | 'finance director' | tax | 'transfer pricing' | audit:* | treasury | 'cash management' | risk | compliance | aml | kyc | investment:* | 'm&a' | 'corporate development' | 'private equity' | 'equity research' | valuation | 'fp&a' | 'financial planning' | 'financial analyst' | 'finance analyst' | 'business finance' | 'finance manager' | accountant | accounting | 'accounts payable' | 'accounts receivable' | controller | bookkeep:* | payroll | billing`
   - **Filter and regexes must agree:** every term in `title_advanced` must be matched by a
     category regex in section 8, and every regex term must be in `title_advanced`. A prefix term
     like `audit:*` needs a regex like `audit\w*` (so "Auditing", "Auditor" match); `investment:*`
     needs `investments?`. Otherwise we pay for jobs that `toRow` then throws away.
     If you change one, change the other in the same commit.
2. `GET /expired-ats?time_frame=1d` — IDs of jobs that closed yesterday (no Jobs credits).
   Response (per OpenAPI spec): a plain JSON array of integer job IDs.
   Allowed `time_frame`: `1h`, `1d`, `1m`, `6m` (no `7d`). On Day 6, `1m` closes dev jobs that closed before go-live.
3. `GET /active-ats-count` — number of jobs matching the same filters; returns `{"count": N}`.
   No Jobs credits. Accepts `time_frame` `1h`, `24h`, `7d`, `1m`, `6m`. Use it before any big fetch.
- Full parameter list: the public OpenAPI spec at `https://data.fantastic.jobs/openapi` (no key needed).

**Free-trial budget (hard rule: no paid fantastic.jobs plan this week).**
Every job returned by `active-ats` costs 1 Jobs credit. Every API call also uses 1 request credit.
The trial is 500 Jobs credits + 50 request credits and ends **2026-10-13 11:20 UTC**.
Goal: put as many FRESH jobs as possible on the live site, spending little during development.

1. Done on Day 2: ONE-job call (`limit=1`) to read the credit headers → 499 Jobs credits left.
   That job is kept (`data/first-job.json`) and loaded like any other.
2. **Budget (agreed 2026-10-07), T = 499:**

   | Part | Credits | Setting | When |
   |---|---|---|---|
   | Test | 5 | `--test` in `scripts/backfill.mjs` | Day 2 |
   | Dev backfill | 100 | `BACKFILL_MAX = 100` at the top of `scripts/backfill.mjs` | Day 2 |
   | Fresh load | ≈370 (all that's left after nightly + reserve) | `--fresh` in `scripts/backfill.mjs` | 2026-10-12 at the latest, or right before go-live if earlier |
   | Nightly sync | 5 per night | `MAX_JOBS_PER_RUN = 5` (env var for `jobs/sync.ts`) | after go-live, until the trial ends |
   | Reserve | 10 | `MIN_CREDITS_RESERVE = 10` (env var for `jobs/sync.ts` + top of backfill.mjs) | never spent |

3. **Every fetched job is kept.** Test jobs are saved to `data/raw-jobs.json` and loaded like
   any other job. Nothing paid for is thrown away (except jobs `toRow` rejects).
4. **No paying twice for the same job.** The dev backfill continues where the test stopped:
   it only asks for jobs posted before the oldest job already saved (`date_posted_lt`).
5. **Fresh load (2026-10-12 at the latest, or right before go-live if earlier):** take `x-api-jobs-remaining` from
   `data/credits.json` (or one count call if it's out of date), then
   `FRESH_LOAD_MAX = remaining − MIN_CREDITS_RESERVE − 5 × (nightly runs left before the trial ends)`.
   Show me the number and wait for my "yes". It fetches the newest jobs (`time_frame=7d`, newest
   first) into `data/raw-fresh.json`. The live database gets the fresh load PLUS the dev jobs
   (first job, test, dev backfill); `expired-ats?time_frame=1m` then closes any dev jobs that
   have closed since. This replaces the earlier "catch-up" plan.
6. Every script and the sync job stop at their cap, or when `x-api-jobs-remaining` would drop
   below `MIN_CREDITS_RESERVE`, and log why they stopped.
7. Every fetch saves the raw response to its file in `data/` BEFORE processing. Never re-fetch to
   "try again" without asking me; reprocess the saved file with `scripts/load-jobs.ts` instead.
8. Credits spent on any other test (e.g. the Day 5 local sync test) come out of the fresh
   load, because it is computed from what is left.
9. When the trial ends, the site keeps the jobs it has; only new jobs stop.
10. **Request credits are scarce (43 left on 2026-10-07; every call uses 1, count calls too).**
    No count calls or other extra API calls unless really needed. `scripts/fantastic.mjs` saves
    the latest credit headers to `data/credits.json` after every call, so scripts know what is
    left without asking the API. After each API step, tell me the Jobs AND request credits left.

Fields we use: `id`, `title`, `organization`, `org_logo_permalink`, `url`, `date_posted`,
`countries_derived`, `regions_derived` (US state), `cities_derived`, `ai_work_arrangement`,
`ai_experience_level`, `ai_salary_min_value`, `ai_salary_max_value`, `ai_salary_value`,
`ai_salary_currency`, `ai_salary_unit_text`, `ai_core_responsibilities`,
`ai_requirements_summary`, `description_text`.
On Day 2, check in real data: that `regions_derived` holds full state names (e.g. "California"),
the exact values of `ai_work_arrangement` used for fully-remote jobs, the exact values of
`ai_experience_level`, and any non-finance titles that slip through (e.g. medical billing,
healthcare compliance) so we can add exclusions (section 8, rule 3).

## 7. Database: Payload collections (PostgreSQL)

Payload creates the PostgreSQL tables from these collection configs. Field names are camelCase in
Payload; in PostgreSQL the columns are snake_case (e.g. `stateSlug` → `state_slug`), which is
what SQL in `lib/db.ts` uses. Payload adds its own `id`, `createdAt`, `updatedAt`.

**`jobs`** (collection `Jobs`) — one document per job:

| Field | Type | Notes |
|---|---|---|
| `sourceId` | number, **unique**, indexed | the fantastic.jobs `id` (was the old `id` column) |
| `slug` | text, unique, indexed | rule 7 in section 8 |
| `title`, `cleanTitle`, `titleSlug` (indexed) | text | |
| `company`, `companySlug` (indexed), `logo` | text | `logo` is the image URL |
| `companyIndustry`, `companySize` | text | `org_linkedin_industry` / `org_linkedin_size` |
| `category` | select (8 keys from section 8), indexed | admin can correct it |
| `level` | select: entry / mid / senior / lead, indexed | admin can correct it |
| `state`, `stateSlug` (indexed), `city`, `citySlug` (indexed) | text | |
| `isRemote` | checkbox | |
| `workArrangement` | text | On-site, Hybrid, Remote OK, Remote Solely |
| `payMin`, `payMax` | number | yearly USD |
| `summary`, `requirements`, `description` | textarea | |
| `applyUrl` | text | |
| `datePosted` | date, indexed | |
| `status` | select: open / closed, default open, indexed | set by the sync |
| `hidden` | checkbox, default false, indexed | admin switch: hides a bad job from the site |

Plus compound indexes like the old ones: (status, hidden, category, stateSlug, citySlug),
(status, hidden, stateSlug, citySlug), (status, hidden, level).
Admin list view shows title, company, category, level, state, status, hidden, datePosted, and is searchable by title and company.

**`sync-runs`** (collection `SyncRuns`): `ranAt` (date), `added`, `closed` (numbers), `error` (text;
also holds "stopped: ..." notes). Read-only in the admin.

**`users`** (collection `Users`): Payload auth collection for admin logins only (email + password).

**`category-pages`** (collection `CategoryPages`): one document per category key (unique `key`
select with the 8 keys) with `intro` (textarea), `seoTitle`, `seoDescription`. List pages use
them when filled, otherwise the default text from `lib/seo.ts`.

**`site-text`** (global `SiteText`): `homeHeadline`, `homeSubline`, `defaultSeoDescription`.
The Home page uses them when filled, otherwise the current text.

Access: public site reads happen server-side through the Local API; creating, editing and
deleting is allowed only for logged-in admin users. Later (NOT now) we will add collections for
articles/blogs and educational content; keep the setup simple so they can be added as new collections.

## 8. Sorting rules (`shared/rules.js`)

`toRow(apiJob)` turns one API job into one `jobs` row, or returns `null` to skip it.

1. **Country:** skip unless `countries_derived[0]` is `United States`.
2. **Place:** `state` = `regions_derived[0]`, `city` = `cities_derived[0]` (either may be null),
   plus `state_slug`, `city_slug`. `is_remote` = 1 for fully-remote jobs (`ai_work_arrangement`).
   `work_arrangement` keeps the raw `ai_work_arrangement` value (for the work-style chip);
   `company_industry` / `company_size` come from `org_linkedin_industry` / `org_linkedin_size`.
   Jobs with no state still count on national pages (e.g. `/fpa-jobs`).
   State codes for titles like "Austin, TX" come from `shared/states.js` (50 states + DC).
3. **Category:** first skip the job if its title matches the `EXCLUDE` list (non-finance matches
   such as medical billing or healthcare compliance; empty until filled from real data on Day 2).
   Then test the title against these rules in order; first match wins; no match = skip.
   (Regexes kept in sync with `title_advanced` in section 6.)

| Order | Key | Label | URL | Title regex (case-insensitive) |
|---|---|---|---|---|
| 1 | `leadership` | Finance Leadership | `/finance-leadership-jobs` | `\b(cfo\|chief financial\|vp,? finance\|head of finance\|finance director)\b` |
| 2 | `tax` | Tax | `/tax-jobs` | `\b(tax\|transfer pricing)\b` |
| 3 | `audit` | Audit | `/audit-jobs` | `\baudit\w*` |
| 4 | `treasury` | Treasury | `/treasury-jobs` | `\b(treasury\|cash management)\b` |
| 5 | `risk-compliance` | Risk & Compliance | `/risk-compliance-jobs` | `\b(risk\|compliance\|aml\|kyc)\b` |
| 6 | `investment` | Investment & Corporate Development | `/investment-jobs` | `(\binvestments?\b\|\bm&a\b\|\bcorporate development\b\|\bprivate equity\b\|\bequity research\b\|\bvaluation\b)` |
| 7 | `fpa` | FP&A | `/fpa-jobs` | `(fp&a\|financial planning\|financial analyst\|finance analyst\|business finance\|finance manager)` |
| 8 | `accounting` | Accounting | `/accounting-jobs` | `(accountant\|accounting\|accounts payable\|accounts receivable\|controller\|bookkeep\|payroll\|billing)` |

4. **Level** (`entry` / `mid` / `senior` / `lead`): title words first, then `ai_experience_level`.
   - lead: `\b(cfo|chief|vp|vice president|head|director|partner)\b`, else `10+`
     — EXCEPT "business partner" (e.g. "Finance Business Partner"): that is NOT a lead word;
     such titles go on to the senior/entry checks and otherwise end up mid.
   - senior: `\b(senior|sr|lead|principal|avp)\b`, else `5-10`
   - entry: `\b(intern|trainee|graduate|junior|jr|entry)\b`, else `0-2`
   - otherwise mid
5. **Clean title:** split at ` - ` (hyphen WITH spaces around it), `,`, `(`, `|`, `–` or `—`
   and keep the first part — unless the first part has no finance keyword (no category regex
   matches it); then keep the first part that does: "Associate - Investment Accounting" →
   "Investment Accounting" (agreed 2026-10-07). If no part matches, keep the first part.
   If the first part was skipped and is only 1–2 words once seniority words are removed (a short
   role like "Manager", "Specialist", "Senior Director"), join it after the finance part:
   "Senior Manager, Accounting" → "Accounting Manager", "Senior Director, FP&A" → "FP&A Director",
   "Analyst, Accounts Receivable" → "Accounts Receivable Analyst",
   "Associate - Investment Accounting" → "Investment Accounting Associate" (agreed 2026-10-07).
   Longer first parts are not joined ("Workforce Excellence Specialist, National Tax Operations"
   → "National Tax Operations").
   A hyphen inside a word is kept ("Full-Charge Bookkeeper" stays whole).
   Remove whole words senior/sr/jr/junior/I/II/III/IV and 4-digit years ("Summer 2027 Tax
   Internship" → "Summer Tax Internship"); collapse spaces; Title Case, but keep known
   abbreviations in capitals: FP&A, CFO, CPA, VP, AVP, AP, AR, M&A, AML, KYC, SEC, GL, US,
   IT, BSA, AWM. "Sr. Financial Analyst - FP&A (Austin)" → "Financial Analyst";
   "FP&A Manager" → "FP&A Manager"; "Senior Manager, IT Audit" → "IT Audit Manager".
   **Company name:** strip the data note "No relevant LinkedIn company found." (it arrives glued
   to some names: "No relevant LinkedIn company found.PIPESTONE" → "PIPESTONE").
6. **Pay:** use `ai_salary_min_value`/`ai_salary_max_value` (fall back to `ai_salary_value`), only
   when currency is USD. Convert to yearly: YEAR×1, MONTH×12, WEEK×52, DAY×260, HOUR×2080. Round.
   No pay → NULL. Never estimate or invent pay.
7. **Slugs:** lowercase, drop apostrophes (`'` and `’`: "Children's" → `childrens`),
   `&`→`and`, non-alphanumerics→`-`, trimmed.
   Job slug = `<company-slug>-<title-slug>-<city-slug or state-slug>-<id>`.

## 9. Pages and URLs (every combination is its own page)

| Page | URL pattern | Example |
|---|---|---|
| Home | `/` | — |
| All US finance jobs | `/finance-jobs` | — |
| Finance jobs in a state | `/finance-jobs/[state]` | `/finance-jobs/california` |
| Finance jobs in a city | `/finance-jobs/[state]/[city]` | `/finance-jobs/california/san-francisco` |
| Remote finance jobs (US) | `/finance-jobs/remote` | — |
| Category (US) | `/[category]-jobs` | `/fpa-jobs` |
| Category in a state | `/[category]-jobs/[state]` | `/fpa-jobs/texas` |
| Category in a city | `/[category]-jobs/[state]/[city]` | `/fpa-jobs/texas/austin` |
| Category, remote | `/[category]-jobs/remote` | `/fpa-jobs/remote` |
| Level (US) | `/[level]-level-finance-jobs` | `/entry-level-finance-jobs`, `/mid-level-finance-jobs`, `/senior-level-finance-jobs`, `/lead-level-finance-jobs` |
| All locations | `/locations` | every state with counts, and its cities with counts |
| Job titles index | `/titles` | simple A–Z list of titles with `MIN_JOBS_PER_PAGE`+ open jobs, with counts |
| Job title | `/titles/[title]` | `/titles/financial-analyst` |
| Companies index | `/companies` | simple A–Z list of companies with open jobs, with counts |
| Company | `/companies/[company]` | `/companies/stripe` |
| Pay overview | `/salaries` | each category: low, median, high yearly USD, number of jobs with pay |
| Pay for a category | `/salaries/[category]` | `/salaries/fpa` — US figure + table by state |
| Job | `/jobs/[slug]` | — |
| (redirect) | `/jobs` | permanent redirect to `/finance-jobs` |

Routing (Next.js App Router, inside `app/(frontend)/`): one dynamic route `[listing]/page.tsx`
handles `/finance-jobs`, every `/<category>-jobs` and every `/<level>-level-finance-jobs`;
`[listing]/[place]/page.tsx` handles a state or `remote`; `[listing]/[place]/[city]/page.tsx`
handles a city. Static routes (`/locations`, `/salaries`, `/titles`, `/companies`, `/jobs`) and
Payload's `/admin` and `/api` take priority.
Level pages have no state/city sub-pages in week 1. Unknown slugs → 404.

**Thin-page rule:** a state or city page (for "all finance" or a category) exists only if it has
at least `MIN_JOBS_PER_PAGE` open jobs; otherwise return 404 and never link to it. Job title
pages (and the `/titles` index) use the same minimum.
`MIN_JOBS_PER_PAGE` is a setting, never a hard-coded number: **1 locally** (`.env.local`, so every
page type can be built with only ~100 dev jobs) and **3 in production** (TrueFoundry environment variable).
Hidden jobs (`hidden = true`) never count toward any page, count or pay figure.

**Every list page shows:**
- An H1 and `<title>` with the count and place, e.g. "37 FP&A Jobs in Austin, TX" and
  meta description like "Browse 37 open FP&A jobs in Austin, Texas from companies hiring now. Pay range $85K–$130K."
  (built in `lib/seo.ts`).
- The job list, newest first, 50 per page (`?page=2` is fine for pagination only).
- **Internal links** (this replaces any dropdown): on `/fpa-jobs` a "FP&A jobs by state" list
  linking to each `/fpa-jobs/[state]` that passes the thin-page rule, with counts; on a state page
  a "by city" list; on a city page, links back to the state and to the same city's other
  categories. Breadcrumbs on every page: Home › FP&A jobs › Texas › Austin.
- A pay line for that page's jobs when 5+ state pay (low, median, high).

Job page: title, company + logo, city/state or Remote, level, category, pay or "Pay not stated",
posted date, summary, requirements, full description, big "Apply on company site" button
(opens `apply_url` in a new tab), and a short note next to it that the job comes from the
employer's own careers site (fantastic.jobs terms allow job-board use of the full description). Closed job: "This role has closed" + 5 similar open jobs
(same category and state). Links to its category, state and city pages.

Shared: header (name, Finance jobs, Locations, Salaries), footer with links to all categories and
the top 15 states, empty state "No open jobs here yet". Pay format `$85,000–$105,000`.

**SEO rules (every public page; added 2026-10-07):**
1. **Canonical tag** on every public page via Next.js metadata (`alternates.canonical`): an absolute
   URL built from `SITE_URL`, lowercase, no trailing slash, no query string — except page 2+ of a
   list, which is canonical to itself (`/fpa-jobs?page=2`) and gets "— Page 2" in its `<title>`. (Day 4)
2. **Real status codes:** unknown slugs, thin pages (below `MIN_JOBS_PER_PAGE`) and hidden jobs
   return a real HTTP 404, never a 200 "not found" page. (Day 4)
3. **BreadcrumbList structured data** (JSON-LD) matching the visible breadcrumbs, on list pages
   and job pages. (Day 4)
4. **JobPosting structured data** (JSON-LD) on OPEN job pages only, so jobs can appear in Google
   for Jobs. Only real data, never invented: `title`, `description` (the description text with its
   line breaks as HTML paragraphs), `datePosted`, `hiringOrganization` (`name`, `logo` when we have
   it), `jobLocation` (`addressLocality` = city, `addressRegion` = 2-letter state code,
   `addressCountry` = "US"); for `Remote Solely` jobs use `jobLocationType: "TELECOMMUTE"` plus
   `applicantLocationRequirements` = Country "US"; `baseSalary` only when the employer states pay
   (`currency` USD, `unitText` YEAR, `minValue`/`maxValue`); `directApply: false`. Leave out any
   field we don't have (e.g. no `validThrough`, no `employmentType`). Use Google's structured-data
   guidelines for job postings; after go-live, test a few job pages in Google's Rich Results Test. (Day 5)
5. **Closed jobs:** the job page stays (HTTP 200) with "This role has closed" + 5 similar open jobs,
   but gets `robots: noindex`, has NO JobPosting markup, and is not in the sitemap.
   Hidden jobs: 404 and not in the sitemap. (Day 5)
6. **sitemap.xml + robots.txt** (`app/(frontend)/sitemap.ts`, `app/(frontend)/robots.ts`, or wherever
   the Next.js docs say for this project's route groups). The sitemap is built from the database at
   request time and lists: home, every list page that passes the thin-page rule (page 1 only),
   `/locations`, `/titles` + title pages, `/companies` + company pages, `/salaries` pages, and every
   open, non-hidden job (`lastModified` = the job's `updatedAt`). If it ever passes 50,000 URLs, split
   it (Next.js `generateSitemaps`). robots.txt allows everything except `/admin` and `/api`, and
   links to the sitemap. (Day 5)
7. **Caching (Day 6):** before going live, switch public pages from `force-dynamic` to time-based
   revalidation (refresh at most every 15 minutes) so pages are fast as traffic grows; `/admin`,
   `/api`, the sitemap and anything reading the logged-in user stay dynamic. Check that hiding a job
   in `/admin` still removes it from the site within 15 minutes. If revalidation causes problems with
   Payload, keep `force-dynamic` and tell me.
8. **Google Search Console (Day 7, after the domain is live):** verify the domain, submit
   `SITE_URL/sitemap.xml`, and note it in Notes.
Our unique value for Google is everything around the copied employer description: the summary, pay
comparison, state/city pages and CMS intro text — keep those on every page.

## 10. Nightly sync (`jobs/sync.ts`)

A normal Node script (no Cloudflare Worker). Run it locally with `npm run sync`; online it runs as a
TrueFoundry Job with a schedule trigger `0 2 * * *` (UTC), from the same Docker image as the site.
Settings come from environment variables: `MAX_JOBS_PER_RUN` (5), `MIN_CREDITS_RESERVE` (10),
`FANTASTIC_JOBS_KEY`, `DATABASE_URL`, `PAYLOAD_SECRET`, `REDIS_URL` (+ `REDIS_CA_CERT` if needed).
At the very end it clears the site's Redis cache (new cache version), so new and closed jobs show
at once; a Redis problem only logs a warning and never fails the run.

1. Fetch `active-ats` with `time_frame=24h` (parameters in section 6), stopping at
   `MAX_JOBS_PER_RUN` (5 — just to prove the sync works) or when `x-api-jobs-remaining` would
   drop below `MIN_CREDITS_RESERVE` (10). Map with `toRow` (shared/rules.js), drop nulls.
   **Create only jobs whose `sourceId` doesn't exist yet**; never overwrite an existing job, so
   admin edits (category, level, `hidden`) are kept.
2. Call `expired-ats?time_frame=1d` every night (no Jobs credits), and set `status = 'closed'` on
   our open jobs whose `sourceId` is in that list. This keeps running after the trial ends if the
   API still allows it.
3. Always create one `sync-runs` document (ranAt, added, closed, error), even on failure; put the
   stop reason in `error` when it stopped at a cap (e.g. "stopped: nightly cap 5 reached").
Uses Payload's Local API (`getPayload`) to read and write. Exits with code 0 on success and 1 on
failure, so TrueFoundry shows failed runs.
Local test: `MAX_JOBS_PER_RUN=5 npm run sync` (real credits; they come out of the fresh load —
budget rule 8). Ask me before running it.

The gap between the dev backfill (Day 2) and go-live is covered by the fresh load
(section 6, budget rule 5), not by the sync.

## 11. Design

**Build every page to match `design/DESIGN.md`** (approved 2026-10-07). It defines the colour
tokens, fonts (IBM Plex Sans + IBM Plex Mono), layout, components and each page's sections.
The mockups in `design/mockups/` are visual references only: rebuild their look in
Next.js + Tailwind, never copy their mockup format (`<x-dc>`, `<sc-for>`, `{{holes}}`) or sample data.
- Colour tokens live in the Tailwind theme (`app/globals.css`); use them, not raw hex values.
- Site name is "finance-community" (chosen 2026-10-07, replaces the placeholder "Ledgerline"),
  set in `lib/site.ts` (`SITE_NAME`); change it only there.
- Clearly different from financeroles.co and growthroles.com. Mobile-friendly (check at 375px), fast, no heavy animation.

## 12. Out of scope for week 1 (do not build unless I ask)

Other countries, site-wide search box, dropdown/query-string filters, level × place pages,
email alerts, visitor accounts, payments, AI/MCP features,
salary estimates, articles/blogs and educational content (planned later as new Payload collections).

## 13. Progress (update at the end of each day)

- [x] Day 1 — Tools installed, free Cloudflare account, project created locally (not deployed), git, runs on localhost
- [x] Day 2 — Trial credits checked + budget in Notes, local D1 + schema, rules.js, 5-job test + capped dev backfill (100) loaded locally
- [x] Day 3 — lib/db.ts, lib/format.ts, lib/seo.ts, JobCard, Home, Job page (local)
- [x] Setup before Day 4 — branch `move-to-payload`, OrbStack, PostgreSQL 17 in Docker, `.env.local`
- [x] Day 4A — Switch to Payload + PostgreSQL: Payload installed, collections + globals, Cloudflare removed, 104 jobs loaded, Home + Job pages unchanged (local)
- [x] Day 4 — Finance/category list pages + state, city and remote pages, /locations, internal links, breadcrumbs; SEO rules 1–3: canonical tags, real 404s, BreadcrumbList (local)
- [x] Day 5 — Level, title, company, salaries pages; SEO rules 4–6: JobPosting, closed-job handling, sitemap.xml + robots.txt (local); `jobs/sync.ts` written and tested locally with MAX_JOBS_PER_RUN=5
- [x] Fresh load — by 2026-10-12 (before the trial ends 2026-10-13 11:20 UTC): ~370 newest jobs saved to data/raw-fresh.json
- [ ] Day 6 — Go live on TrueFoundry: production PostgreSQL, migrations, dev + fresh jobs loaded, expired check (1m), Docker image, site Service deployed, secrets set, nightly sync Job scheduled, page caching (SEO rule 7), SITE_URL set
- [ ] Day 7 — Custom domain, branding, polish, Google Search Console + sitemap submitted (SEO rule 8), demo rehearsal

Notes / decisions log (append here):
- Scope: US only; places = US states and cities (+ Remote). Every place combination is its own page (SEO), no query-string filters.
- Local-first: no deploys before Day 6. ~~Cloudflare account / Workers Paid~~ — no longer relevant (moved to TrueFoundry, 2026-10-07).
- Whole week must fit in the fantastic.jobs free trial. Trial credits: 500 Jobs + 50 requests
  (first call 2026-10-07: 499 Jobs / 49 requests left).  Trial ends: next billing date header =
  2026-10-13 11:20 UTC; dashboard end date + whether it auto-renews to a paid plan: ___ (I check)
  Budget AGREED 2026-10-07 (replaces my first proposal of 50/250/199/25), T = 499:
  test 5 (kept) / dev backfill 100 (`BACKFILL_MAX`) / Day 6 fresh load ≈370 (all remaining except
  nightly + reserve) / nightly 5 per run (`MAX_JOBS_PER_RUN`) / reserve 10 (`MIN_CREDITS_RESERVE`).
  Full rules in section 6.
- Market size (count endpoint, our exact filters, 2026-10-07): 24h = 1,349 jobs; 7d = 6,508 jobs.
  The trial covers under 10% of one week, so the live site shows only the newest ~370–475 jobs.
- Thin-page minimum is a setting: `MIN_JOBS_PER_PAGE` = 1 locally, 3 in production (section 9).
- 2026-10-07 — Non-finance check on the 104 dev jobs (`EXCLUDE` stays empty for now):
  A. KEEP car-dealer "Finance Manager" jobs (Sonic Automotive, Capital Nissan, Findlay Honda).
     No exclusion rules for now.
  B. KEEP casino gaming compliance (M Resort) and the BDO "Workforce Excellence Specialist,
     National Tax Operations" job. Also kept: "Billing Stay Specialist" (Ronald McDonald House).
- 2026-10-07 — Clean-title fixes agreed (section 8, rule 5): join short role words with the
  function, remove 4-digit years, add IT/BSA/AWM abbreviations, strip "No relevant LinkedIn
  company found." from company names. Slugs drop apostrophes (rule 7).
- Day 6 must be completed before the trial ends: 2026-10-13 11:20 UTC (section 3).
- expired-ats longest supported window: `1m` (allowed: 1h, 1d, 1m, 6m; no 7d) — from the OpenAPI spec.
- Day 2 API checks: parameter names all correct (OpenAPI spec); `limit` max is 1000 (not 500);
  count endpoint is `/v1/active-ats-count`; `regions_derived` holds full state names ("Wisconsin");
  fully-remote value is `Remote Solely` (others: Remote OK, Hybrid, On-site);
  `ai_experience_level` values: 0-2, 2-5, 5-10, 10+.
- 2026-10-07 — Plan review decisions (all written into the sections above):
  1. Check API parameter names against the docs before any call (section 6).
  2. `title_advanced` and the category regexes must match; added `investments?`, `audit\w*`,
     and `'vp finance'`, `'m&a'` to the API filter (sections 6, 8).
  3. ~~Day 6 one-time catch-up~~ — REPLACED on 2026-10-07 by the Day 6 fresh load (section 6,
     budget rule 5); `expired-ats?time_frame=1m` closes dev jobs that closed meanwhile.
  5–6. Trial size and end date checked on Day 2.
  7. Clean title cuts only at " - " and keeps abbreviations like FP&A, CFO, CPA, VP, AP, AR, M&A (section 8).
  8. Check real data on Day 2; add an `EXCLUDE` list for non-finance matches if needed (section 8).
  9. "partner" = lead, except "business partner" (section 8).
  10. State name -> code list incl. DC in `shared/states.js` (sections 5, 8).
  11. A–Z index pages for `/titles` and `/companies`; `/jobs` redirects to `/finance-jobs` (section 9).
  13. fantastic.jobs terms allow job-board use: show full description + "from the employer's site" note + Apply button (section 9).
- fantastic.jobs trial API key: I have it; I will paste it into `.dev.vars` myself (never in chat or git).
- 2026-10-07 — Day 1 done:
  - Node upgraded 20 → 24.21.0 LTS (Homebrew `node@24`); npm 11.19.0; git 2.50.1.
  - Free Cloudflare account (Google sign-in); `npx wrangler login` succeeded (wrangler 4.148.0).
  - Project created with `npm create cloudflare@latest -- finance-jobs --framework=next --variant=opennext`.
    `--variant=opennext` is required: create-cloudflare now defaults to a different adapter (vinext).
    Versions: Next.js 16.3.8, @opennextjs/cloudflare 1.20.x, Tailwind 4, TypeScript 5.
  - Template's `src/app` moved to `app/` (tsconfig `@/*` → `./*`) to match section 5.
  - `.dev.vars` from the template holds `NEXTJS_ENV=development`; keep that line and add the API key below it.
  - Runs locally at http://localhost:3000 with `npm run dev`. Nothing deployed.
- 2026-10-07 — Day 2 done:
  - **Credits left after Day 2: 394 Jobs, 42 requests** (also in `data/credits.json`).
    Spent: 1 credit check + 5 test + 100 dev backfill = 106 Jobs credits; 8 request credits.
  - 2 of those credits bought duplicates of the Day 2 credit-check job (the test overlapped it,
    and the dev backfill's `date_posted_lt` only looked at raw-jobs.json). Before the Day 6 fresh
    load, the "already have it" check must cover every saved file.
  - Local D1 uses a placeholder `database_id` (all zeros) in `wrangler.jsonc`; the real
    database is created with `wrangler d1 create finance-jobs` on Day 6.
  - Local DB holds 104 open jobs (first job + 5 test + 99 new from the dev backfill; 0 rejected):
    accounting 62, fpa 11, tax 11, risk-compliance 6, audit 6, investment 4, treasury 2,
    leadership 2. Levels: mid 45, senior 27, entry 22, lead 10. Remote 6. With pay 54.
    Top states: TX 15, CA 10, FL 9, NY 5, MN 5. 16 states have 3+ jobs.
  - Reload the local DB any time without API calls:
    `node scripts/make-seed.mjs && npx wrangler d1 execute finance-jobs --local --file=db/seed.sql`
  - `shared/package.json` (`"type": "module"`) lets Node run `shared/*.js` as ES modules.
- 2026-10-07 — Day 3: approved design added (`design/DESIGN.md` + 3 mockups); section 11 now says
  build every page to match it. To support its work-style chip and "About the company" box, the
  `jobs` table gained 3 columns (agreed): `work_arrangement`, `company_industry`, `company_size`
  (sections 7, 8). Local DB rebuilt from saved files (0 API credits). Because `CREATE TABLE IF NOT
  EXISTS` won't add columns to an existing table, a rebuild needs `DROP TABLE jobs` first:
  `npx wrangler d1 execute finance-jobs --local --command="DROP TABLE IF EXISTS jobs"`, then
  schema.sql, then seed.sql.
- 2026-10-07 — Day 3 done (local only, 0 API credits; still 394 Jobs / 42 requests):
  - Design tokens in `app/globals.css` (`@theme`), IBM Plex Sans/Mono via `next/font` in `app/layout.tsx`.
  - Components: Header (+ NavLinks, LogoMark), Footer, Breadcrumbs, CompanyTile, Chip, PayChip,
    JobCard (compact/full), ApplyButton, SidebarBox (+ LinkList, PillLinks, LinkGrid).
  - Pages: Home `/`, Job `/jobs/[slug]` (open, no-pay, closed + 5 similar, pay-in-state box when
    5+ listings state pay), styled 404. Checked at 1280px and 375px (no sideways scroll).
  - Header/footer read D1, so the root layout is `force-dynamic` too.
  - The job page's state/city links appear only when that category page passes `MIN_JOBS_PER_PAGE`.
  - "verified today" from the mockup is NOT shown: we don't store a last-checked date (don't invent data).
  - Restart `npm run dev` after changing `wrangler.jsonc` bindings (it reads them only at start).
  - `npx eslint` crashes in the template's own config (FlatCompat circular JSON); not fixed yet.
- 2026-10-07 — Setup before Day 4 (stack moving from Cloudflare to Payload CMS + PostgreSQL on
  TrueFoundry; app code and Cloudflare files not changed yet). Work is on git branch `move-to-payload`.
  - OrbStack 2.2.3 installed with Homebrew (Docker 29.4.0, Docker Compose v5.1.2).
  - PostgreSQL 17.11 runs in Docker: `docker-compose.yml`, service `postgres`, image `postgres:17`,
    port 5432 (localhost only), named volume `postgres-data`, `restart: unless-stopped`.
    Payload's docs name no required version; its own CI uses postgres:15, so 17 was chosen.
  - DB name, user, password and `DATABASE_URL` live in `.env.local` (git-ignored). `.dev.vars` kept as is.
  - Start `docker compose up -d` · stop `docker compose stop` · status `docker compose ps`.
- 2026-10-07 — **Stack change decided:** Cloudflare → **Payload CMS 3 + PostgreSQL 17, hosted on
  TrueFoundry** (manager's decision; Payload chosen over Directus because it is MIT open source,
  runs inside the same Next.js app = one service to deploy, and suits the later articles/education
  content). Why a CMS: an admin panel to view/search jobs, hide or fix bad jobs (wrong category,
  car-dealer finance managers), and edit page text (category intros, home headline, SEO text) now;
  articles/blogs, educational content, manually added jobs and multiple editors later.
  Changed sections: 1, 2 (visitor accounts), 3, 4, 5, 6 (env/file names), 7, 9 (routing folder,
  MIN_JOBS_PER_PAGE location, hidden jobs), 10, 12, 13. Unchanged: rules (8), pages (9), design (11), budget numbers (6).
  Notes above that mention D1, wrangler, `.dev.vars` or `make-seed.mjs` describe Days 1–3 history.
- TrueFoundry: manager gives me a new workspace for this site. Production PostgreSQL location: a managed cloud database; provider not chosen yet (2026-10-08).
- 2026-10-07 — Day 4A done (branch `move-to-payload`, local only, 0 API credits; still 394 Jobs / 42 requests):
  - Compatibility: Payload 3.90.2 (`@payloadcms/next` peer: next `>=16.3.3 <17`) fits Next.js 16.3.8;
    React 19.3.0 fits `^19.2.1`; Node 24. Payload packages pinned to exactly 3.90.2 (they must match).
    Installed: payload, @payloadcms/next, @payloadcms/ui, @payloadcms/db-postgres, graphql.
    No rich-text editor or sharp (no rich-text or upload fields yet).
  - `payload.config.ts`: Postgres adapter with `push: false` (tables change ONLY via migrations),
    `migrationDir: migrations/`, admin `robots: noindex, nofollow`. First migration
    `migrations/20261007_134254_initial.ts` (12 tables incl. the 3 compound indexes) applied.
  - Access: Payload's default (logged-in users only) for everything; SyncRuns create/update/delete
    off in the admin. The site and scripts use the Local API, which skips access rules.
  - Site moved to `app/(frontend)/`; Payload's `app/(payload)/` copied from its blank template
    (v3.90.2). Two root layouts → `experimental.globalNotFound` in `next.config.ts` +
    `app/global-not-found.tsx` (force-dynamic so the build never needs the database);
    `app/(frontend)/not-found.tsx` handles notFound(). Both use `components/NotFoundContent.tsx`.
  - `scripts/load-jobs.ts` (`npm run load-jobs`, runs via `payload run`): 104 created, 0 rejected;
    a second run creates 0. Counts identical to Day 2 (accounting 62, fpa 11, tax 11, audit 6,
    risk-compliance 6, investment 4, leadership 2, treasury 2; mid 45, senior 27, entry 22, lead 10;
    remote 6; with pay 54; TX 15, CA 10, FL 9, MN 5, NY 5; 16 states with 3+).
  - `shared/rules.js`: new `toJobData(row)` (toRow → Payload camelCase fields; date_posted stored as
    UTC ISO); old `COLUMNS` removed. `scripts/fantastic.mjs` reads the key from the environment,
    else `.env.local`.
  - `lib/db.ts` rewritten with the same function names/shapes (rows stay snake_case for the pages).
    Raw SQL goes through `payload.db.pool`; PostgreSQL returns COUNT/numeric as text, so SQL casts
    (`::int`, `::float8`). `category`/`level`/`status` are PostgreSQL enums: pass only valid keys.
    `getJobBySlug` returns closed jobs but never hidden ones (hidden job page = 404).
  - Checked: Home + Job pages identical to Day 3 at 1280px and 375px (no sideways scroll); unknown
    job and unknown URL → styled 404; hiding a job (Local API, same as the admin checkbox) drops
    the home count 104 → 103, removes it from the list and 404s its page; un-hiding restores it.
  - Removed (section 5 list): wrangler.jsonc, .dev.vars (key verified identical in .env.local first),
    open-next.config.ts, cloudflare-env.d.ts, public/_headers, db/, scripts/make-seed.mjs, .wrangler/,
    the Cloudflare packages + scripts, `.vscode/settings.json` (wrangler file association only).
    README replaced with a short local-run guide. `npm run dev` and `npm run build` both work;
    the built app was also smoke-tested with `next start`.
  - Admin user: Claude does not create it (my email/password). I create it myself at
    http://localhost:3000/admin ("Create your first user"). Done 2026-10-07 (1 admin user), and I
    tested the hide switch in /admin myself (job's edit page → Hidden → Save): it works; 0 jobs hidden after.
  - Known warnings (harmless for now): Payload "No email adapter" (no emails sent yet); npm 11
    "install scripts not covered by allowScripts" (esbuild checked and works); `npm audit` reports
    24 vulnerabilities in dependencies — not fixed (`npm audit fix --force` could break versions);
    review before Day 6.
  - Correction: the Credo test link given on Day 3 was wrong; the real job is
    /jobs/credo-payroll-analyst-san-jose-2400407535.
- 2026-10-07 — SEO additions agreed (section 9, "SEO rules" 1–8): canonical tags, real 404s and
  BreadcrumbList on Day 4; JobPosting structured data (Google for Jobs), closed-job noindex and
  sitemap.xml + robots.txt on Day 5; time-based page caching on Day 6; Search Console on Day 7.
  Sitemap and JobPosting are no longer "after week 1" (section 12). New setting `SITE_URL` (section 4).
- 2026-10-08 — Day 4 done (branch `move-to-payload`, local only, 0 API credits; still 394 Jobs / 42 requests):
  - Routes in `app/(frontend)/`: `[listing]/page.tsx`, `[listing]/[place]/page.tsx`,
    `[listing]/[place]/[city]/page.tsx`. All three use `[listing]/listing.tsx` (not a route): it
    reads the URL, applies the 404 rules, loads data once per request (React `cache()`, shared with
    `generateMetadata`) and draws the page. New: `/locations`, components `PlaceLinks`, `PayStrip`, `JsonLd`.
  - Level pages (`/entry-level-finance-jobs` etc.) already work through the same route (US only;
    level × place → 404). Day 5 only needs to check them.
  - Fixed: Finance Leadership URL is `/finance-leadership-jobs` (section 8); the code had `/leadership-jobs`.
  - 404 rules: unknown listing/state/city slug, uppercase URLs, level + place, `remote/<city>`,
    thin state/city/category-remote pages, `?page=` not a positive number or past the last page,
    hidden jobs. `/finance-jobs/remote` always exists (it is linked from the site-wide footer),
    like the national pages; national pages with 0 jobs show "No open jobs here yet".
  - `?page=1` and any other query string (e.g. `?state=texas`) → canonical without the query.
  - CategoryPages text (intro, seoTitle, seoDescription) is used only on the national category page
    (`/fpa-jobs` and its page 2+), so 50 state pages never share one admin-written title. State and
    city pages always get their own generated title/description/intro. Tested: 0 docs after the test.
  - `next.config.ts`: `htmlLimitedBots: /.*/` keeps title/description/canonical in `<head>` for every
    visitor (Next.js 16 otherwise streams them into `<body>`, where Google ignores a canonical), and
    `/jobs` → `/finance-jobs` permanent redirect (308).
  - `SITE_URL` is read by `siteUrl()` in `lib/site.ts`; in production it throws if not set.
  - BreadcrumbList JSON-LD comes from the `Breadcrumbs` component itself, so it always matches the
    visible trail (unlinked thin places are left out of the JSON-LD).
  - Checked with curl: status codes, `<title>`, description, canonical, JSON-LD and sidebar links on
    every page type; hiding a job (Local API) → its page 404 and counts drop by 1, then restored.
    Production build + `next start` with `MIN_JOBS_PER_PAGE=3`: thin pages 404 and no page links to one.
  - Not checked by Claude (no browser): the look at 1280px and 375px. I check it myself: done.
- 2026-10-08 — Day 5 done (branch `move-to-payload`, local only):
  - **Credits after the local sync test: 389 Jobs, 41 requests** (last reported by the API, in
    `data/credits.json`). The sync's active-ats call used 5 Jobs + 1 request credit. The expired-ats
    call returns no credit headers, so whether it used 1 more request credit is not known (if so: 40).
    These 5 Jobs credits come out of the fresh load (budget rule 8).
  - Sync test (`MAX_JOBS_PER_RUN=5 npm run sync`): added 5 (all new, 0 rejected), closed 0 of 109 open;
    sync-runs #1 "stopped: nightly cap 5 reached". The site now has 109 open jobs.
  - expired-ats real shape checked: a plain JSON array of integer ids, as the OpenAPI spec says
    (`1d` = 121,994 ids, 1.3 MB). No change needed; sync.ts also accepts `[{id}]` / strings, just in case.
  - `jobs/sync.ts` (`npm run sync` = `payload run jobs/sync.ts`): asks only for jobs posted at or after
    our newest job (`date_posted_gte`), creates only unknown sourceIds, never overwrites. When the
    credit headers are unknown (no data/credits.json, e.g. first run online) it first asks for 1 job to
    read them. Step 2 (expired) runs even if step 1 fails. `EXPIRED_TIME_FRAME=1m` for the Day 6
    go-live run (closes dev jobs that closed meanwhile). Exit 1 on any error.
  - New pages: `/titles`, `/titles/[title]` (MIN_JOBS_PER_PAGE), `/companies`, `/companies/[company]`
    (1+ open job), `/salaries`, `/salaries/[category]` (404 unless 5+ US jobs in it state pay; states
    table only with 5+ stating pay). Level pages were already built on Day 4. Title and company pages
    reuse the list-page layout (`[listing]/listing.tsx`). New components: AzIndex, PayTable, PayMethod.
  - SEO rules 4–6: JobPosting JSON-LD on open jobs (title = clean title, description = description
    paragraphs as HTML, Remote Solely → TELECOMMUTE + US; baseSalary only when pay is stated);
    closed jobs → `noindex, follow`, no JobPosting, not in the sitemap, and no company link (its
    company page may not exist). `app/sitemap.ts` + `app/robots.ts` (root of `app/`, per the Next.js
    docs), both per request.
  - Checked: production build + `next start` with MIN_JOBS_PER_PAGE=3: all 256 sitemap URLs return 200,
    224 internal links crawled, 0 broken; thin title page 404. Closed-job handling tested on one job,
    then reopened (0 closed jobs after).
  - Not checked by Claude (no browser): the new pages at 1280px and 375px. I check it myself: done.
- 2026-10-08 — Links to /titles and /companies added (agreed): home sidebar box "More ways to browse"
  (Job titles A–Z, Companies hiring, with counts) and footer Explore column (Job titles, Companies),
  so every page links to both index pages.
- 2026-10-08 — In-page filter boxes on /locations, /titles and /companies (agreed exception to "no
  search box"): `components/ListFilter.tsx`, browser-only. The full list stays in the server HTML;
  typing only hides non-matching items (`hidden`). No new URLs, no query strings. Checked before/after
  on a production build: status, title, description, canonical, robots, JSON-LD, H1, every link and
  link text identical; sitemap identical (563 URLs); only added text is the screen-reader label;
  +2.2 KB JavaScript, loaded only on those 3 pages. Tested typing in headless Chrome; no sideways
  scroll at 375px.
- 2026-10-08 — Fresh load done (local, 08:40 UTC; agreed number 354):
  - FRESH_LOAD_MAX = 389 − 10 − 5 × 5 nightly runs (02:00 UTC Oct 9–13) = 354.
    `node scripts/backfill.mjs --fresh=354` → 1 call, 354 jobs, **349 new** saved to data/raw-fresh.json
    (posted 2026-10-07 14:47 → 2026-10-08 05:22 UTC). The other 5 were the jobs the Day 5 sync had
    already added: 5 credits paid twice (my "~6 hours" estimate was wrong; 354 jobs spanned ~14.5 h).
    backfill.mjs now also reads data/raw-fresh.json and data/sync/*-active-*.json as "already saved".
  - `npm run load-jobs`: 349 created, 104 already there, 0 rejected → **458 open jobs**.
  - Expired check: `MAX_JOBS_PER_RUN=0 EXPIRED_TIME_FRAME=1m npm run sync` → 3,063,616 expired ids,
    0 of ours (checked again directly against the database); sync-runs #2.
  - **Credits left: 35 Jobs (= 25 for 5 nightly runs + 10 reserve), 39 requests.** This also shows the
    Day 5 expired-ats call used a request credit (41 → 40 before today).
  - Counts: accounting 264, fpa 65, tax 54, risk-compliance 30, investment 17, audit 12, treasury 11,
    leadership 5; mid 174, senior 146, entry 96, lead 42; remote 13; with pay 271; TX 55, CA 50,
    FL 33, NY 24, WA 23, OH 19; 30 states with 3+ jobs. Sitemap (local, min 1): 1,864 URLs, all
    non-job pages return 200.
  - Day 6: load the same saved files into the production database (`npm run load-jobs`, 0 credits),
    then `EXPIRED_TIME_FRAME=1m` once more (1 request credit) right after go-live.
- 2026-10-08 — Security review (`npm audit`: 20 → 13; 0 API credits):
  - Fixed with `overrides` in `package.json` (only these 2 packages changed in the lockfile):
    `undici` 7.29.0 → 7.29.1 (inside `payload`, which pins it) and `dompurify` 3.4.15 → 3.4.16
    (inside `monaco-editor`, the /admin code editor). Payload 3.90.2 is already the latest.
  - Left as is (not reachable by visitors): `braces` (no fixed version exists; used by sass's
    file watcher and eslint) and `esbuild` 0.18 inside `drizzle-kit` (its dev-server flaw; we never
    run that server; forcing a newer one could break `payload migrate`).
  - Never run `npm audit fix --force`: it downgrades Payload to 3.85.1, which doesn't support Next.js 16.3.8.
  - Checked: production build, every page type's status code, sitemap 1,864 URLs, /admin, migrate:status,
    `npm run load-jobs` (0 created, 458 open). Remove the overrides once Payload ships the patched versions.
  - Also removed two stale Cloudflare decisions (local D1, Workers Paid) from the plan-review list.
- 2026-10-08 — Redis cache layer added (branch `move-to-payload`, local only, 0 API credits):
  - Why: fewer database reads as traffic grows; the cache is shared by all visitors and all servers.
  - Client: `@redis/client` 6.3.0 (core of the official node-redis, no sub-packages; works with any
    standard Redis/Valkey, `rediss://` TLS + password in REDIS_URL, optional REDIS_CA_CERT).
  - Local Redis: `redis:7.2-alpine`, 64 MB, volatile-lru, no disk. Password generated by Claude
    straight into `.env.local` (never shown).
  - Keys: `fc:<SCHEMA>:<version>:<function>:<args>`; the version (`fc:ver`, random, no expiry)
    changes on every job/category-page change, so old entries are never read again and expire
    within 15 minutes. The sitemap is cached too (agreed): it changes at once with the version.
  - Works with SEO rule 7 (Day 6): Next.js page caching (HTML, per server, refresh ≤ 15 min) sits on
    top; Redis data is never older than the last change, so a hidden job still disappears within
    15 minutes in total. List pages reading `?page=` stay dynamic, so Redis is what speeds them up.
  - Checked (production build, MIN_JOBS_PER_PAGE=3, 1,022 URLs = every sitemap URL + 14 test URLs
    incl. 404s, page 2, the /jobs redirect): status, title, description, canonical, robots, JSON-LD,
    H1, every link + text and the full HTML identical to before the change with Redis empty, full
    (100% hits), stopped (1 warning) and frozen (`CLIENT PAUSE`; first page 0.30 s, 1 warning).
    All 32 lib/db.ts reads return identical data with the cache off / miss / hit. All keys under
    `fc:`, all expire within 900 s (except `fc:ver`). /admin and /api create no keys. Hiding a job
    (from a separate process, like the sync Job) → its page 404, counts −1 and out of the sitemap
    at once; un-hiding restores it; a category intro shows/disappears at once; load-jobs clears the
    cache. `npm run build` + `next start` with REDIS_URL empty: pages identical, no Redis traffic.
  - Not run: `npm run sync` (uses API credits); it calls the same `bumpCacheVersion()`.
- 2026-10-08 — GitHub: private repository https://github.com/t-koyna/finance-jobs (account t-koyna),
  remote `origin`. Before the first push, all git history was checked: no secret from `.env.local`
  and no `.env*` / `data/` file was ever committed. Branches renamed (locally and on GitHub):
  `move-to-payload` → **`main`** (default branch, all current work), old Cloudflare `main` → `old-main`.
  Commits stay local until pushed (`git push`); Claude pushes only when asked.
