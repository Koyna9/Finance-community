# DESIGN.md — approved UI design (build every page to match this)

The approved mockups are in `design/mockups/`:
- `home.mockup.html` → Home page (`/`)
- `listing-fpa-texas.mockup.html` → every list page (category, category × state/city, finance × place, level, title, company)
- `job.mockup.html` → Job page (`/jobs/[slug]`)

They are design references written in a mockup format (`<x-dc>`, `<sc-for>`, `{{holes}}`).
Do NOT copy that format into the app. Read them for layout, spacing, colours and copy, and rebuild
the same look in Next.js + Tailwind. The jobs, companies and pay in the mockups are SAMPLE data;
the real pages read from the database (Payload CMS + PostgreSQL).

Site name: **"finance-community"** (chosen 2026-10-07; replaces the placeholder "Ledgerline"). Put the name in one constant (`lib/site.ts`:
`SITE_NAME`) so it can be changed in one place.

## 1. Design tokens (put these in the Tailwind theme)

| Token | Hex | Use |
|---|---|---|
| `ink` | `#0B2545` | Logo, hero background, primary buttons, logo-tile text |
| `accent` | `#2E9E77` | Decorative only (logo mark's tall bar). Never for text |
| `accent-text` | `#17694D` | Links like "See all →", stated pay text, active nav item |
| `accent-tint` | `#E8F3EE` | Stated-pay chip background, median pay cell, salaries promo box |
| `accent-tint-text` | `#24453A` | Text on `accent-tint` |
| `text` | `#0E1B2A` | Headings, main text |
| `text-body` | `#24303D` | Long reading text (job description) |
| `text-2` | `#3E4A59` | Secondary text, chip text, company names |
| `muted` | `#556170` | Captions, counts, "posted 2h ago" |
| `bg` | `#F5F7FA` | Page background |
| `surface` | `#FFFFFF` | Cards, header, footer |
| `surface-2` | `#FBFCFD` | Pay box / pay strip background |
| `chip` | `#F1F4F8` | Chip background |
| `logo-tile` | `#E7EDF4` | Company initials tile background |
| `border` | `#E1E6EC` | Card and section borders |
| `border-soft` | `#EEF1F5` | Row dividers inside lists |
| `border-strong` | `#D6DDE5` | Pill links, secondary button border |
| Hero text | `#FFFFFF`, eyebrow `#9FD3BE`, body `#D5DEE8`, stat labels `#C4CFDB` | Only inside the navy hero |

Link colour `#0B2545`; on hover `#1F7A5C` + underline. Visible focus ring on every link/button (2px `ink` or `accent-text` outline with offset).

## 2. Typography

- Fonts via `next/font/google`: **IBM Plex Sans** (400, 500, 600, 700) for everything,
  **IBM Plex Mono** (500, 600) for numbers only: pay, job counts, stats. Fallbacks: `'Helvetica Neue', sans-serif` and `monospace`.
- Scale: hero H1 46px/700, line-height 1.12, letter-spacing -0.02em · list-page H1 38px/700 ·
  job-page H1 36px/700 · section H2 26px/700 · sidebar H2 17–18px/700 · card title 18px (home) / 19px (list) /600 ·
  body 16–17px, line-height 1.5–1.7 · small 14px · caption 13px.
- Hero eyebrow: Plex Mono 13px, uppercase, letter-spacing 0.08em.

## 3. Layout

- Content width: `max-width: 1200px`, horizontal padding 24px, centred.
- Two-column pages (Home lower section, list pages, job page): a wrapping flex row, gap 32px —
  main column `flex: 999 1 560px; min-width: 0`, sidebar `flex: 1 1 300px; min-width: 0`.
  On phones the sidebar drops below the main column automatically. Sidebar is never sticky.
- Radii: cards 10px, logo tiles 9–12px, chips 6px, buttons 8px, pill links 999px.
- Cards: white, 1px `border`, no shadows, no coloured left borders, no gradients, no emoji.
- Touch targets at least 44px tall (nav links, buttons, pill links have enough padding).

## 4. Components (one file each in `components/`)

- **Header** — white bar, bottom border. Left: logo mark (32px `ink` square, radius 7, with three
  small vertical bars: two white, the tallest `accent`) + site name 20px/700 in `ink`.
  Right nav: "Finance jobs" (`/finance-jobs`), "Locations" (`/locations`), "Salaries" (`/salaries`);
  active item in `accent-text` 600.
- **Footer** — white, top border. Name + one-line description ("Finance jobs from US employers'
  own hiring pages. You apply directly with the company.") + link columns: Roles (all 8 categories),
  Top states (top 4–15 by count), Explore (Locations, Salaries, Remote jobs).
- **Breadcrumbs** — 14px `muted`, "›" separators, last item `text` 500 (not a link).
- **CompanyTile** — square with the company logo image if `logo` exists, otherwise 2-letter
  initials (700, `ink` on `logo-tile`). 48px on home cards, 52px on list cards, 64px on job page.
- **Chip** — 13px `text-2` on `chip`, radius 6, padding 5×9. Location chip has a small map-pin
  outline icon (inline SVG, `aria-hidden`).
- **PayChip** — Plex Mono 13px/600. Stated pay: `accent-text` on `accent-tint`, short form
  `$165K–$195K` (pay stated per hour/month: `$25–$32/hr`, `$300/mo`). No pay: "Pay not stated"
  in `muted` on `chip`.
- **JobCard** — white card, padding 18–20px, CompanyTile left; right side: company (14px/500
  `text-2`) with posted time right-aligned (13px `muted`, "2h ago"/"1d ago"); title as the link
  to the job page; on list pages only a one-line blurb (15px `text-2`, first sentence of
  `summary`, max ~160 chars); then chips: location, work style (list pages), level, role (home),
  PayChip. Variant prop: `compact` (home) vs `full` (list pages).
- **PayStrip** (list pages) — bordered row of cells: Low · **Median** (cell on `accent-tint`,
  value in `accent-text`) · High · a note "Yearly, from the X of Y listings that state full-time
  pay" + link to the category's salary page. Only shown when 5+ jobs on that page state full-time
  pay (part-time, contract, temporary and intern pay is left out; SEO audit 2026-10-12).
- **SidebarBox** — white card, padding 20, H2 17–18px. Variants: link list with counts
  (rows divided by `border-soft`, count in Plex Mono `muted`), pill links, 2-column link grid.
- **ApplyButton** — `ink` background, white 16px/600 text, radius 8, min-height 48px, outward
  arrow icon; opens `apply_url` in a new tab (`target="_blank" rel="noopener noreferrer"`).

## 5. Pages

**Home (`/`)** — from `home.mockup.html`
1. Navy hero: eyebrow "US finance jobs · updated every night"; H1 "Finance roles at US companies,
   straight from their hiring pages."; subline; quick pill links (Accounting, FP&A, Tax,
   Remote finance jobs, Entry level); 3 stats in Plex Mono from the database: open jobs,
   states with pages (≥ MIN_JOBS_PER_PAGE), listings stating pay.
2. "Browse by role": grid of 8 category cards (`repeat(auto-fill, minmax(260px, 1fr))`): name,
   one-line hint, "N open jobs" in Plex Mono `accent-text`. Link to `/<category>-jobs`.
3. Two columns: "Latest jobs" (20 newest JobCards, compact) + button "See all N finance jobs";
   sidebar: "Browse by state" (top states with counts, link "All locations →"), "By experience
   level" (2×2 tiles with counts), salaries promo box on `accent-tint`.

Category hints: Accounting "Staff accountants, AP/AR, controllers" · FP&A "Financial analysts,
planning, business finance" · Tax "Tax accountants, specialists, managers" · Risk & Compliance
"Risk, compliance, AML, KYC" · Audit "Internal, external and IT audit" · Investment & Corp Dev
"M&A, valuation, investment accounting" · Treasury "Cash management, liquidity" ·
Finance Leadership "CFO, VP and head of finance".

**List pages** — from `listing-fpa-texas.mockup.html` (built on Day 4, same components)
White top band: breadcrumbs, H1 ("FP&A Jobs in Texas"), one-sentence intro with count and top
cities, PayStrip. Then two columns: "N jobs · newest first" + full JobCards + pagination;
sidebar: by-city (or by-state) links with counts (only pages passing the thin-page rule),
"Other finance jobs in <place>" pill links, "<Role> jobs in other states" 2-column grid.

**Job page (`/jobs/[slug]`)** — from `job.mockup.html`
White top band: breadcrumbs (Home › Category › State › City), CompanyTile 64px, company name
(link to company page), H1 title, chips (location, work style, level, category), "Posted X ago ·
verified today". Right: pay box on `surface-2` — "Pay stated by employer", full figures in Plex
Mono `accent-text` ("$120,000–$140,000", "per year"), ApplyButton, note "You'll apply on
<Company>'s own careers page." (No pay: show "Pay not stated" and still the button.)
Main column cards: "The role at a glance" (summary), "What they're looking for" (requirements
as a list), "Full job description" with label "From the employer's listing" (description text,
paragraphs kept), ApplyButton again. Sidebar: "<Role> pay in <State>" (low/median/high + one
line comparing this job, only when 5+ jobs state pay), "About the company" (name, industry,
size when known; link to all their jobs), "More <Role> jobs nearby" (3 similar open jobs) +
pill links to the category's city and state pages.
Closed job: replace the pay box with a notice "This role has closed" and show 5 similar open jobs.

## 6. Rules

- Don't invent data: anything missing is simply not shown (no "N/A" walls).
- Text contrast at least 4.5:1 (the tokens above already pass on their intended backgrounds).
- Real `<a href>` for navigation and `<button>` only for actions; icon-only controls get `aria-label`.
- Must look right at 375px wide: hero text wraps, nav wraps, grids collapse, sidebar stacks.
