# DEPLOY.md — go-live checklist (TrueFoundry)

Everything here was rehearsed locally (Day 5B) except the parts that need the cloud. Fill in the
blanks (`___`) when the hosting, database and Redis details are known. Background: `CLAUDE.md`
sections 4, 9 (SEO rules) and 10 (sync).

## 1. One Docker image, four workloads

Build from the repo root with the `Dockerfile` (TrueFoundry can build it from the Git repo; if you
build on an Apple-silicon Mac yourself, add `--platform linux/amd64`). The image contains no
secrets: every setting below is given as an environment variable or secret at run time.

| Workload | TrueFoundry type | Command | When |
|---|---|---|---|
| **Site** | Service, port **3000** | (image default: `next start`) | always on |
| **Release** | Job, run manually | `npm run release` (migrate, then load-jobs) | once before the first deploy, and after every deploy that adds a migration or new `data/` files |
| **First admin** | Job, run manually | `npm run create-admin` | once (creates a user only if none exists) |
| **Nightly sync** | Job, schedule `0 2 * * *`, timezone **UTC** | `npm run sync` | every night |

Health check for the Service (liveness and readiness): **`GET /healthz`** on port 3000 →
`200 ok`. It does not touch the database, so a short database hiccup does not restart the site.

## 2. Environment variables and secrets

S = mark as **secret** in TrueFoundry. "—" = not needed by that workload.

| Name | S | Site | Release | First admin | Sync | Value |
|---|---|---|---|---|---|---|
| `DATABASE_URL` | S | ✔ | ✔ | ✔ | ✔ | `postgres://USER:PASSWORD@<rds-endpoint>:5432/DBNAME?sslmode=require` → ___ (**`?sslmode=require` = SSL**, see 2a) |
| `PAYLOAD_SECRET` | S | ✔ | ✔ | ✔ | ✔ | generate once: `openssl rand -hex 32`; **the same value everywhere** |
| `REDIS_URL` | S | ✔ | ✔ | — | ✔ | `rediss://:PASSWORD@HOST:PORT` → ___ (empty = no cache; the site still works) |
| `REDIS_CA_CERT` | S | if needed | if needed | — | if needed | only if the cloud's Redis TLS needs its own CA (GCP Memorystore): the PEM text → ___ |
| `SITE_URL` |  | ✔ | — | — | — | the address people use, no trailing slash: first the TrueFoundry URL ___, later the domain ___ |
| `ALLOW_INDEXING` |  | ✔ | — | — | — | **leave unset** (= search engines blocked) on the TrueFoundry address; `true` only once the real domain is live (Day 7) |
| `MIN_JOBS_PER_PAGE` |  | ✔ | — | — | — | `3` |
| `FANTASTIC_JOBS_KEY` | S | — | — | — | ✔ | the fantastic.jobs API key |
| `MAX_JOBS_PER_RUN` |  | — | — | — | ✔ | `5`; `0` after the trial ends (see 4) |
| `MIN_CREDITS_RESERVE` |  | — | — | — | ✔ | `10` |
| `SYNC_TIME_FRAME` |  | — | — | — | optional | `24h` (default); `7d` for the first live run only |
| `EXPIRED_TIME_FRAME` |  | — | — | — | optional | `1d` (default); `1m` for the first live run only |
| `ADMIN_EMAIL` |  | — | — | ✔ | — | the admin's email |
| `ADMIN_PASSWORD` | S | — | — | ✔ | — | at least 12 characters; never printed. Remove it after the job ran |
| `CACHE_TTL_SECONDS` |  | optional | — | — | — | `900` (default) |

### 2a. Database SSL (AWS RDS)

SSL is set in the connection string only: end `DATABASE_URL` with **`?sslmode=require`** on all four
workloads. No certificate files or extra settings are needed. The connection is encrypted (RDS
handles the server side); `sslmode` means the same as in `psql`/`pg_restore` (require = encrypted,
server certificate not checked). `lib/database-pool.ts` makes the app's PostgreSQL library use that
standard meaning (on its own, the library would read `require` as "verify the certificate" and fail).
- Tested against an SSL-only PostgreSQL: without `sslmode` the server refuses; with `?sslmode=require`
  the site, release, create-admin and sync all connect, every connection encrypted (TLS 1.3).
- Importing a dump with `pg_restore`: the same `?sslmode=require` at the end of its URL.

`NODE_ENV=production` and `PORT=3000` are already set in the image. Without `SITE_URL` the site
starts, but its pages fail with an error (it is needed for canonical links and the sitemap).

## 3. Go-live order

1. **Production PostgreSQL** (AWS RDS, PostgreSQL 17; SSL: section 2a) and **Redis** (managed, same cloud;
   requirements in `CLAUDE.md` section 4: Redis OSS 7.x or Valkey 7.2/8, one primary, cluster mode
   disabled, not ElastiCache Serverless, smallest node, `maxmemory-policy volatile-lru`, no
   persistence, TLS on, password on, private network only). Note their addresses.
2. **Build the image** (TrueFoundry from Git, or locally with `--platform linux/amd64`).
3. **Release job** → its log should end with `Open jobs in Payload: 458` (or more).
4. **First-admin job** → `Admin user created: …`; then delete `ADMIN_PASSWORD` from that job.
5. **Site Service** with the variables above, `ALLOW_INDEXING` unset. Check:
   `/healthz` = `ok`; home page shows the job count; a job page, `/locations`, `/salaries` load;
   `/admin` asks for a login; `/robots.txt` = `Disallow: /` (blocked, correct for now); no
   `[cache]` warnings in the Service log (= Redis works).
6. **Sync job** (schedule `0 2 * * *` UTC). For the **first** run only, add `SYNC_TIME_FRAME=7d` and
   `EXPIRED_TIME_FRAME=1m` (closes dev jobs that closed since; 1 request credit), then remove both.
7. **Day 7, real domain:** point the domain at the Service, set `SITE_URL` to it and
   `ALLOW_INDEXING=true`, restart the Service, THEN the CloudFront invalidation `/*` (not before:
   CloudFront would re-cache pages with noindex and the old canonicals). Then from a laptop:
   `npm run check-live -- https://<domain>` must end with "All checks passed" (read-only; it checks
   robots.txt + sitemap line, no noindex header, every sitemap URL and sample canonicals on the
   domain, JobPosting on job pages). Then Google Search Console + submit `SITE_URL/sitemap.xml`.
   Before launch, `npm run check-live -- https://<temporary address> --staging` checks the blocked setup.

## 3b. Updating the live site (every new version)

Restarting the Site Service never changes the database. Database changes (migrations) run only in
the **Release job**, and it must run BEFORE the new site code starts.

1. **Build the new image.**
2. If the new version adds a migration (a new file in `migrations/`): set the **Release job** to the
   new image and **run it first**. It adds the new columns, then `load-jobs` fills them in on existing
   jobs from the saved files in the image: 0 API credits, nothing re-created, admin edits kept. Its log
   ends with `Created: 0. Already there: N (newer fields filled in: N). …`, `Company names cleaned up: N.`
   and `Open jobs in Payload: …`.
   The running site keeps working meanwhile (the old code ignores the new columns; tested).
3. **Then** set the **Site Service** and the **Sync job** to the new image (the Service restarts).
4. Without a new migration, steps 1 and 3 are enough (running the Release job anyway does no harm).

Migration `20261012_212424_job_type_website_stated_pay` (SEO fixes, 2026-10-13) adds the job's
employment type, company website and pay as stated (per hour/month/year). Jobs the live sync added
after the database import have no saved file in the image, so these fields stay empty for them; such
jobs show exactly as before.

## 4. Check the 02:00 UTC sync run (next morning)

1. TrueFoundry → the sync Job → last run: status **succeeded** (a failed run exits with code 1).
   The log ends with `Done: added N, closed N. …` and `Jobs credits left: … Request credits left: …`.
2. `/admin` → **Sync Runs** → newest row: `ran at` ≈ 02:00 UTC, `added`, `closed`, and in `error`
   either nothing or a "stopped: …" note (e.g. "stopped: nightly cap 5 reached" is normal).
3. The site shows new jobs at once (the sync clears the Redis cache at the end).

**After the fantastic.jobs trial ends (2026-10-13 11:20 UTC):** set `MAX_JOBS_PER_RUN=0`
("expired-only": no jobs call, closed jobs are still closed while the API allows it).

## 5. Known limits

- **Page cache per server:** job and salary-category pages are cached for up to 15 minutes in each
  Service replica. Hiding a job in `/admin` refreshes them at once on the replica that handled the
  save; with more than 1 replica, the others refresh within 15 minutes. Jobs closed by the sync show
  as closed within about 15 minutes.
- **Container files are temporary:** the sync saves raw API responses to `data/sync/` and the
  credit headers to `data/credits.json` inside the container; they disappear when the run ends (the
  jobs themselves are in the database). Each run therefore starts from the credit numbers built into
  the image and reads the real ones after its first API call; the nightly cap of 5 keeps this safe.
- `npm audit` reports 13 known, accepted warnings (see `CLAUDE.md` Notes, 2026-10-08).
