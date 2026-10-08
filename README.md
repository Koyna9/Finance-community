# finance-community — US finance job board

Next.js + Payload CMS + PostgreSQL. The full project brief (stack, rules, pages, budget, progress)
is in [CLAUDE.md](CLAUDE.md); the approved design is in [design/DESIGN.md](design/DESIGN.md).

## Run it locally

1. Settings: `cp .env.example .env.local`, then fill in your own values (`.env.local` is
   git-ignored; never commit it). Every setting is explained in `.env.example`.
2. Open OrbStack (or Docker), then start PostgreSQL + Redis: `docker compose up -d`
   (check: `docker compose ps`).
3. `npm install`, then `npx payload migrate` (creates/updates the tables).
4. Jobs data (optional; see below), then `npm run load-jobs` (no API calls).
5. `npm run dev` → site at http://localhost:3000, admin at http://localhost:3000/admin
   (the first visit to `/admin` asks you to create your admin user).

## Jobs data

The saved job files (`data/*.json`) are not in git: they are raw API data, not code.
- **Without them** the site runs with an empty database ("No open jobs here yet"), which is
  enough for most code and design work.
- **With the real jobs:** ask the project owner for the `data/` files (shared privately, never
  through git), put them in a `data/` folder in this project, then run `npm run load-jobs`. It
  loads them into your database without any API calls and is safe to run again.
