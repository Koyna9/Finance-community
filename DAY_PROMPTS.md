# Prompts to paste into Claude Code (one block at a time)

Start every day with a NEW Claude Code conversation and paste that day's prompt.
Claude Code reads CLAUDE.md automatically, so these prompts stay short.
Wait for each step to finish and check it before moving on.
Everything before Day 6 is local only (localhost). Going live (on TrueFoundry) happens on Day 6.

**Stack change (2026-10-07):** Days 1–3 were built on Cloudflare (D1). From Day 4A the project uses
Payload CMS + PostgreSQL, hosted on TrueFoundry. The Kick-off and Day 1–3 prompts below are kept
as history only; don't paste them again.

---

## Kick-off (Day 1, first message) — done, history

```
Read CLAUDE.md fully. Then, without writing any code yet:
1. Summarise the project back to me in 5-6 bullet points so I know you understood it
   (especially: US only, states and cities as separate pages, local-first, free-trial budget).
2. List anything unclear or risky in the plan.
3. List what I must do myself (accounts, logins, payments) vs what you will do.
Wait for my reply before starting.
```

## Day 1 — Tools and project, on localhost — done (Cloudflare), history

```
Let's do Day 1 from CLAUDE.md. Everything stays local today; do not deploy.
1. Check I have Node.js LTS, npm and git; tell me how to install anything missing.
2. Guide me to create a FREE Cloudflare account and run `npx wrangler login`.
3. This folder only contains CLAUDE.md (and DAY_PROMPTS.md). Create the Next.js + Cloudflare
   project in THIS folder with `npm create cloudflare@latest -- finance-jobs --framework=next`
   (TypeScript, Tailwind, App Router). Answer NO when it offers to deploy. If it needs an empty
   folder, create it in a temp folder and move everything here, keeping my two .md files.
4. Set up git with a .gitignore including .dev.vars, db/seed.sql and data/. First commit.
5. Run it locally and give me the localhost URL to check.
6. Update Progress in CLAUDE.md.
```

## Day 2 — Local database and first real jobs — done (Cloudflare D1), history

```
Let's do Day 2 from CLAUDE.md. Local only: use --local for every d1 command.
1. Set up the D1 database `finance-jobs` with binding `DB` for local use, write db/schema.sql
   exactly as in section 7, and apply it locally.
2. Write shared/rules.js per section 8, plus a tiny test that runs toRow on 5 fake US jobs
   (with a state, a city, a remote job, a non-US job, a non-finance job) and prints the result.
3. Free-trial budget, section 6: make ONE call with limit=1, read the credit headers, tell me
   my trial credits and end date, and propose the budget split. Then use the count endpoint with
   our exact filters for 24h and 7d. Write the numbers in Notes. Wait for my OK.
4. Write scripts/backfill.mjs. First run it with limit 20: show me 3 rows, confirm
   regions_derived has full state names and which ai_work_arrangement value means fully remote.
   Then ask me before the full capped run (stop at BACKFILL_MAX; save data/raw-jobs.json first).
5. Generate db/seed.sql from the saved file, load it locally, and print counts per category,
   level, top 15 states and top 15 cities.
6. Commit and update Progress.
```

## Day 3 — Home and Job page (local) — done (Cloudflare D1), history

```
Let's do Day 3 from CLAUDE.md. Local only.
1. Create lib/db.ts (all queries), lib/format.ts (USD pay, "3d ago" dates, labels) and
   lib/seo.ts (page title + meta description builders, section 9).
2. Create components/JobCard.tsx.
3. Build the Home page and the Job page (/jobs/[slug]) per section 9, including the
   closed-job state, links to the job's category/state/city pages, and 404.
4. Simple header and footer. Keep styling basic; we brand it on Day 7.
5. Test on localhost with the local D1 data. Commit and update Progress.
```

## Setup before Day 4 — done

OrbStack installed, PostgreSQL 17 running in Docker, `.env.local` holds `DATABASE_URL`,
work is on branch `move-to-payload`.

## Day 4A — Switch to Payload + PostgreSQL (local)

```
Let's do Day 4A from CLAUDE.md: switch from Cloudflare D1 to Payload CMS + PostgreSQL.
Read sections 3, 4, 5, 7 and 10 first. Local only; we stay on branch move-to-payload.
Make sure OrbStack is open and `docker compose ps` shows postgres healthy.

1. Compatibility check: confirm the current Payload release supports our Next.js version
   (peer dependencies + docs). If not, STOP and tell me the options before changing anything.
2. Install Payload into THIS Next.js app with the PostgreSQL adapter, using DATABASE_URL from
   .env.local. Generate a strong PAYLOAD_SECRET into .env.local (never show it). Move our site
   pages into app/(frontend)/ and let Payload add app/(payload)/ for /admin and /api.
3. Create the collections and global exactly as in section 7: Jobs (with sourceId, hidden and the
   indexes), SyncRuns, Users, CategoryPages, and the SiteText global. Create and run the first
   migration. Then tell me how to create my admin user at http://localhost:3000/admin.
4. Move settings from .dev.vars to .env.local (FANTASTIC_JOBS_KEY, MIN_JOBS_PER_PAGE=1) and
   update scripts/fantastic.mjs to read .env.local. Don't print the key.
5. Write scripts/load-jobs.ts: read data/first-job.json and data/raw-jobs.json, run toRow
   (shared/rules.js), and create each job in Payload by sourceId (skip ones that exist).
   NO API calls. Load them and show me counts per category, level, top states and cities;
   they must match Day 2 (104 jobs; accounting 62, fpa 11, tax 11, ...).
6. Rewrite lib/db.ts to use Payload (Local API for lists/single jobs, SQL through Payload's
   PostgreSQL connection for counts and pay summaries), keeping the same function names and
   return shapes so the pages don't change. Only open, non-hidden jobs.
7. Check Home and a Job page at desktop and 375px: they must look and work exactly as before.
   Also hide one job in /admin and confirm it disappears from the site, then un-hide it.
8. Remove everything Cloudflare listed in section 5 ("Removed in Day 4A"), fix comments that
   mention D1 (app/layout.tsx, design/DESIGN.md), and make sure `npm run dev` and `npm run build`
   both work.
9. Commit and update Progress + Notes in CLAUDE.md.
```

## Day 4 — Category and place pages (local)

```
Let's do Day 4 from CLAUDE.md, section 9. Local only.
1. Build the routing: app/[listing]/page.tsx, app/[listing]/[place]/page.tsx and
   app/[listing]/[place]/[city]/page.tsx, handling /finance-jobs, each /<category>-jobs,
   states, cities and remote, inside app/(frontend)/. Unknown slugs and pages under the
   thin-page rule (fewer than MIN_JOBS_PER_PAGE open, non-hidden jobs) return 404.
   Read data only through lib/db.ts. Use CategoryPages intro/SEO text when it's filled.
2. Each page: H1 + <title> + meta description with count and place (lib/seo.ts), job list
   with 50 per page, breadcrumbs, pay line, and the internal-link lists (components/PlaceLinks.tsx):
   by state on national pages, by city on state pages, other categories on city pages.
3. Build /locations (all states with counts, and their cities with counts).
4. No dropdowns and no ?state= filters: every place is its own URL.
5. SEO rules 1–3 (section 9): canonical tags from SITE_URL (add SITE_URL=http://localhost:3000
   to .env.local), "— Page 2" titles for page 2+, real HTTP 404 status for unknown/thin pages and
   hidden jobs, and BreadcrumbList JSON-LD on list and job pages.
6. Test e.g. /fpa-jobs, /fpa-jobs/texas, /fpa-jobs/texas/austin, /finance-jobs/remote,
   and a page that should 404 (show me its status code is really 404 and one canonical tag).
   Commit and update Progress.
```

## Day 5 — Remaining pages + sync tested locally

```
Let's do Day 5 from CLAUDE.md. Local only.
1. Build the level pages (/entry-level-finance-jobs etc.), /titles/[title] (3+ jobs),
   /companies/[company], /salaries and /salaries/[category] (US figure + table by state, only
   states with 5+ jobs stating pay). Same SEO titles, breadcrumbs and internal links.
2. Write jobs/sync.ts per section 10 (Node script using Payload's Local API and shared/rules.js)
   and add `npm run sync`. New jobs only by sourceId; never overwrite existing jobs.
3. Ask me first, then test it locally with MAX_JOBS_PER_RUN=5 against the local PostgreSQL and
   show me the new SyncRuns entry in /admin. Tell me the Jobs and request credits left.
4. Check the real shape of the expired-ats response and adjust if needed.
5. SEO rules 4–6 (section 9): JobPosting JSON-LD on open job pages (real data only), closed jobs
   noindex with no JobPosting, and sitemap.xml + robots.txt. Show me the JSON-LD of one job with
   pay, one without pay and one remote job, and the first lines of /sitemap.xml and /robots.txt.
6. Commit and update Progress. Do not deploy.
```

## Fresh load — by 2026-10-12 at the latest (before the trial ends 2026-10-13 11:20 UTC)

Run this right before going live if Day 6 happens earlier; otherwise run it on 12 October even if
TrueFoundry isn't ready. It only saves jobs to a file on the laptop.

```
Let's do the fresh load from CLAUDE.md section 6, budget rule 5.
1. Read data/credits.json and compute FRESH_LOAD_MAX = remaining − MIN_CREDITS_RESERVE −
   5 × (nightly runs left before the trial ends). Show me the number and wait for my "yes".
2. Fetch the newest jobs into data/raw-fresh.json (skip any job already saved in ANY data/ file).
3. Load them into the local PostgreSQL with scripts/load-jobs.ts and run expired-ats with
   time_frame=1m to close dev jobs that have closed since.
4. Show me the new counts and the Jobs and request credits left. Commit and update Progress.
```

## Day 6 — Go live on TrueFoundry

```
Let's do Day 6 from CLAUDE.md: go live on TrueFoundry. Ask me before every step that deploys,
costs money or changes the production database.
1. Ask me for: the TrueFoundry workspace, how I log in to it (CLI or UI), and where the
   production PostgreSQL is (managed cloud DB or a container in the workspace), and the
   production Redis (a MANAGED Redis on the same cloud as TrueFoundry, probably AWS ElastiCache
   or GCP Memorystore; requirements in CLAUDE.md section 4: Redis OSS 7.x or Valkey 7.2/8, one
   primary, cluster mode disabled, not ElastiCache Serverless, smallest node, maxmemory-policy
   volatile-lru, no persistence, TLS on, password on, private network only): its REDIS_URL
   (rediss://...) and, if the cloud needs it (GCP), the CA certificate for REDIS_CA_CERT.
   Wait for answers.
2. Write a Dockerfile for the Next.js + Payload app (standalone output) and build it locally
   with OrbStack to prove it works.
3. Production database: run the Payload migrations against it, create my admin user, and load
   all saved jobs (first job, test, dev backfill, fresh load) with scripts/load-jobs.ts
   (no API credits). Then run expired-ats with time_frame=1m.
4. Before deploying: SEO rule 7 (section 9), switch public pages to time-based caching and check
   hiding a job still works (with the Redis cache on too). Then deploy the site as a TrueFoundry
   Service with secrets/env vars (DATABASE_URL, PAYLOAD_SECRET, MIN_JOBS_PER_PAGE=3, SITE_URL = the
   live URL, REDIS_URL, and REDIS_CA_CERT if needed). Give me the URL and check every page type,
   /admin, /sitemap.xml and /robots.txt online, and that the site uses Redis (no "[cache]" warnings).
5. Deploy jobs/sync.ts as a TrueFoundry Job from the same image with a schedule trigger
   "0 2 * * *" (UTC), env vars FANTASTIC_JOBS_KEY, MAX_JOBS_PER_RUN=5, MIN_CREDITS_RESERVE=10,
   REDIS_URL (and REDIS_CA_CERT if needed), so each run clears the site's cache at the end.
6. Tell me exactly how to check tomorrow morning that the 02:00 UTC run worked (TrueFoundry job
   run + SyncRuns in /admin). Commit and update Progress.
```

## Day 7 — Domain, branding, demo

```
Let's do Day 7 from CLAUDE.md.
1. Check last night's sync run (TrueFoundry job run + SyncRuns in /admin) and tell me the result.
2. Design polish: compare every page with design/DESIGN.md and fix differences. Confirm the
   site name in lib/site.ts with me.
3. Walk me through pointing our domain at the TrueFoundry service (ask me who manages our DNS),
   then update SITE_URL to the domain. Then SEO rule 8: guide me to verify the domain in Google
   Search Console, submit /sitemap.xml, and test 2 job pages in Google's Rich Results Test.
4. Check every page type at phone width; fix layout issues and empty states.
5. Final review: no secrets in git, all page types load, titles/meta descriptions look right,
   sync works, /admin needs a login. Write a short README (run locally, PostgreSQL start/stop,
   deploy to TrueFoundry, check the sync).
6. Commit and mark Day 7 done in Progress.
```

---

## Handy prompts any day

- When something breaks: `This error happened: <paste error>. Explain in simple words what it means, then fix it.`
- When you don't understand: `Explain what you just did in simple terms, as if I'm new to coding.`
- When you're behind schedule: `We're behind. Per CLAUDE.md, what can we cut today without breaking the place pages or the nightly sync?`
- Database not reachable: `Is OrbStack open and is postgres running (docker compose ps)? Start it and retry.`
- Credit check: `How many fantastic.jobs trial credits are left, and are we still on budget per section 6?`
- End of day: `Summarise what we finished today, what's left, and update the Progress section in CLAUDE.md.`
