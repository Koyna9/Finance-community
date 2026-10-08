# finance-community — US finance job board

Next.js + Payload CMS + PostgreSQL. The full project brief (stack, rules, pages, budget, progress)
is in [CLAUDE.md](CLAUDE.md); the approved design is in [design/DESIGN.md](design/DESIGN.md).

## Run it locally

1. Open OrbStack, then start PostgreSQL: `docker compose up -d` (check: `docker compose ps`).
2. Settings live in `.env.local` (git-ignored): `DATABASE_URL`, `PAYLOAD_SECRET`,
   `FANTASTIC_JOBS_KEY`, `MIN_JOBS_PER_PAGE=1`.
3. `npm install`, then `npx payload migrate` (creates/updates the tables).
4. `npm run load-jobs` loads the saved jobs from `data/*.json` (no API calls).
5. `npm run dev` → site at http://localhost:3000, admin at http://localhost:3000/admin.
