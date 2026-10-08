# finance-community — US finance job board

Next.js 16 + Payload CMS 3 + PostgreSQL 17 + Redis. The full project brief (stack, rules, pages,
data budget, decisions, progress) is in [CLAUDE.md](CLAUDE.md); the approved design is in
[design/DESIGN.md](design/DESIGN.md).

## Set it up on your laptop (step by step)

These steps were tested on a fresh clone (macOS). They take about 5 minutes.

### 1. Install the tools (once per laptop)

| Tool | Version | Check with | Install (macOS, with [Homebrew](https://brew.sh)) |
|---|---|---|---|
| Git | any recent | `git --version` | `brew install git` |
| Node.js + npm | **Node 24** | `node -v` (shows `v24.x`) | `brew install node@24`, then follow Homebrew's note to add it to your PATH |
| Docker | Docker + Compose | `docker compose version` | [OrbStack](https://orbstack.dev) (`brew install orbstack`) or Docker Desktop |

Docker runs the local database (PostgreSQL) and cache (Redis). Open OrbStack / Docker Desktop
before step 5 and keep it running while you work.

### 2. Clone the repository

```
git clone https://github.com/adoptai/finance-community.git
cd finance-community
```

All commands below are run inside this `finance-community` folder.

### 3. Create your settings file

```
cp .env.example .env.local
```

Open `.env.local` in your editor and replace the placeholder values:
- **Passwords:** `POSTGRES_PASSWORD` and `REDIS_PASSWORD` can be anything (they only protect the
  database and cache on your own laptop). Put the same values inside `DATABASE_URL` and
  `REDIS_URL`; `.env.example` shows where.
- **`PAYLOAD_SECRET`:** any long random text, e.g. the output of `openssl rand -hex 32`.
- **`FANTASTIC_JOBS_KEY`:** leave it empty unless you need to fetch new jobs from the API
  (then ask the project owner for it privately).
- Keep `MIN_JOBS_PER_PAGE=1` and `SITE_URL=http://localhost:3000`.

`.env.local` is git-ignored: never commit it, and never put real secrets anywhere else.
Choose the passwords **before** step 5: the database is created with them the first time.

### 4. Install the packages

```
npm ci
```

Installs the exact package versions from `package-lock.json` (about 10 seconds). Warnings about
"install scripts" and "vulnerabilities" are known and harmless (see CLAUDE.md, Notes).

### 5. Start the database and cache

```
docker compose up -d
docker compose ps
```

Wait until both `finance-jobs-postgres-1` and `finance-jobs-redis-1` show **healthy** (a few
seconds; run `docker compose ps` again if needed).

### 6. Create the database tables

```
npx payload migrate
```

It ends with `Done.`

### 7. Load the jobs

```
npm run load-jobs
```

Loads the saved jobs from `data/` into your database (no API calls, no cost). It should say
`Created: 458` and `Open jobs in Payload: 458`. It is safe to run again (it only adds jobs that
are missing).

### 8. Start the site

```
npm run dev
```

Open:
- **Site:** http://localhost:3000. The home page shows the job count.
- **Admin panel:** http://localhost:3000/admin. The first visit asks you to **create your admin
  user** (your own email and password; it only exists in your local database).

Stop the site with `Ctrl+C` in the terminal.

## Every day after that

```
docker compose up -d     # start the database + cache (OrbStack/Docker must be open)
npm run dev              # start the site → http://localhost:3000
# ... work ...
Ctrl+C                   # stop the site
docker compose stop      # stop the database + cache (your data is kept)
```

After pulling new changes from git (`git pull`), run `npm ci` (if `package-lock.json` changed)
and `npx payload migrate` (if there are new files in `migrations/`) before `npm run dev`.

## Other commands

| Command | What it does |
|---|---|
| `npm run build` | Production build (checks everything compiles) |
| `npx tsc --noEmit` | Type check; prints nothing when all is fine |
| `npx payload migrate:status` | Shows which database migrations have run |
| `npm run sync` | Nightly sync: fetches new jobs and closes expired ones. **Uses paid API credits** and needs `FANTASTIC_JOBS_KEY`; ask the project owner before running it |

## Jobs data

The saved API files are in `data/` (committed, no secrets):
- **Jobs** (what `npm run load-jobs` loads): `first-job.json`, `raw-jobs.json`, `raw-fresh.json`
  and the new jobs of each sync run, `data/sync/*-active-*.json`. Together: 458 jobs.
- **Other:** the rest of `data/sync/` (lists of closed job IDs from sync runs) and
  `credits.json` (the last API credit counts).

## If something goes wrong

- **`Cannot connect to the Docker daemon`:** open OrbStack / Docker Desktop and try again.
- **`port is already allocated` (5432, 6379) or `address already in use` (3000):** another
  database, Redis or site is already running on your laptop. Stop it, or stop the other copy of
  this project (`docker compose stop` / `Ctrl+C` there).
- **Database login errors after changing the passwords in `.env.local`:** the database keeps the
  password it was created with. Put the old password back in `.env.local`.
- **`[cache] Redis unavailable` in the log:** the site still works (it reads the database
  directly). Check `docker compose ps` shows Redis as healthy.
- **Never run `docker compose down -v`:** it deletes your local database.
