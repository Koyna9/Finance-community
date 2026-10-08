# finance-community — US finance job board

Next.js + Payload CMS + PostgreSQL. The full project brief (stack, rules, pages, budget, progress)
is in [CLAUDE.md](CLAUDE.md); the approved design is in [design/DESIGN.md](design/DESIGN.md).

## Run it locally

1. Settings: `cp .env.example .env.local`, then fill in your own values (`.env.local` is
   git-ignored; never commit it). Every setting is explained in `.env.example`.
2. Open OrbStack (or Docker), then start PostgreSQL + Redis: `docker compose up -d`
   (check: `docker compose ps`).
3. `npm install`, then `npx payload migrate` (creates/updates the tables).
4. `npm run load-jobs` loads the saved jobs from `data/` into your database (no API calls).
5. `npm run dev` → site at http://localhost:3000, admin at http://localhost:3000/admin
   (the first visit to `/admin` asks you to create your admin user).

## Jobs data

The saved job files are in `data/` (committed): `first-job.json`, `raw-jobs.json` and
`raw-fresh.json` hold the jobs; `data/sync/` holds the raw responses of sync runs and
`credits.json` the last API credit counts. `npm run load-jobs` (step 4) loads the jobs into your
database without any API calls; it is safe to run again (it only adds jobs that are missing).
