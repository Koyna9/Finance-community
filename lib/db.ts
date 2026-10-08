// All data reads used by pages (CLAUDE.md section 4). Lists and single jobs use Payload's Local API;
// counts and pay summaries use plain SQL through Payload's own PostgreSQL connection.
// Pages only ever see jobs with status "open" and hidden = false; getJobBySlug also returns closed
// jobs (the job page shows "This role has closed") but never hidden ones.
//
// Rows keep the snake_case shape the pages were built with on Day 3 (job.clean_title, job.pay_min, ...).
//
// Every exported read goes through the shared Redis cache (`cached`, lib/cache.ts): same results,
// fetched from PostgreSQL only on a miss. Cache keys must include every input that changes the
// result, including MIN_JOBS_PER_PAGE (`min`).

import type { Where } from "payload";
import { cache } from "react";
import { cached } from "@/lib/cache";
import { payloadClient } from "@/lib/payload";
import type { Job as JobDoc } from "@/payload-types";

export type Job = {
	id: number; // Payload id
	source_id: number; // fantastic.jobs id
	slug: string;
	title: string;
	clean_title: string;
	title_slug: string | null;
	company: string | null;
	company_slug: string | null;
	logo: string | null;
	company_industry: string | null;
	company_size: string | null;
	category: string;
	level: string;
	state: string | null;
	state_slug: string | null;
	city: string | null;
	city_slug: string | null;
	is_remote: number;
	work_arrangement: string | null;
	pay_min: number | null;
	pay_max: number | null;
	summary: string | null;
	requirements: string | null;
	description: string | null;
	apply_url: string | null;
	date_posted: string | null;
	status: string;
};

// Columns for job cards (no long text).
export type JobCardRow = Pick<
	Job,
	| "id" | "slug" | "clean_title" | "company" | "company_slug" | "logo" | "category" | "level"
	| "state" | "state_slug" | "city" | "city_slug" | "is_remote" | "work_arrangement"
	| "pay_min" | "pay_max" | "summary" | "date_posted"
>;

export type CountRow = { key: string; label: string; count: number };

export type PayStats = { low: number; median: number; high: number; withPay: number; total: number };

// Payload document -> the row shape the pages use.
function toJob(d: JobDoc): Job {
	return {
		id: d.id,
		source_id: d.sourceId,
		slug: d.slug,
		title: d.title,
		clean_title: d.cleanTitle,
		title_slug: d.titleSlug ?? null,
		company: d.company ?? null,
		company_slug: d.companySlug ?? null,
		logo: d.logo ?? null,
		company_industry: d.companyIndustry ?? null,
		company_size: d.companySize ?? null,
		category: d.category,
		level: d.level,
		state: d.state ?? null,
		state_slug: d.stateSlug ?? null,
		city: d.city ?? null,
		city_slug: d.citySlug ?? null,
		is_remote: d.isRemote ? 1 : 0,
		work_arrangement: d.workArrangement ?? null,
		pay_min: d.payMin ?? null,
		pay_max: d.payMax ?? null,
		summary: d.summary ?? null,
		requirements: d.requirements ?? null,
		description: d.description ?? null,
		apply_url: d.applyUrl ?? null,
		date_posted: d.datePosted ?? null,
		status: d.status,
	};
}

// Fields loaded for job cards (Payload `select`).
const CARD_SELECT = {
	slug: true, cleanTitle: true, company: true, companySlug: true, logo: true, category: true, level: true,
	state: true, stateSlug: true, city: true, citySlug: true, isRemote: true, workArrangement: true,
	payMin: true, payMax: true, summary: true, datePosted: true,
} as const;

function toCard(d: JobDoc): JobCardRow {
	const j = toJob(d);
	return {
		id: j.id, slug: j.slug, clean_title: j.clean_title, company: j.company, company_slug: j.company_slug,
		logo: j.logo, category: j.category, level: j.level, state: j.state, state_slug: j.state_slug,
		city: j.city, city_slug: j.city_slug, is_remote: j.is_remote, work_arrangement: j.work_arrangement,
		pay_min: j.pay_min, pay_max: j.pay_max, summary: j.summary, date_posted: j.date_posted,
	};
}

// What the public site may show.
const VISIBLE: Where = { status: { equals: "open" }, hidden: { equals: false } };
const VISIBLE_SQL = `status = 'open' AND hidden = false`;

// Which jobs a list page shows (all optional; always only visible jobs).
// category / level must be valid keys (they are PostgreSQL enums).
export type ListFilter = {
	category?: string;
	level?: string;
	stateSlug?: string;
	citySlug?: string;
	remote?: boolean;
	titleSlug?: string;
	companySlug?: string;
};

function filterWhere(f: ListFilter): Where {
	const and: Where[] = [VISIBLE];
	if (f.category) and.push({ category: { equals: f.category } });
	if (f.level) and.push({ level: { equals: f.level } });
	if (f.stateSlug) and.push({ stateSlug: { equals: f.stateSlug } });
	if (f.citySlug) and.push({ citySlug: { equals: f.citySlug } });
	if (f.remote) and.push({ isRemote: { equals: true } });
	if (f.titleSlug) and.push({ titleSlug: { equals: f.titleSlug } });
	if (f.companySlug) and.push({ companySlug: { equals: f.companySlug } });
	return { and };
}

// Same filter as SQL; pushes its values onto `values` (so $n numbers continue from there).
function filterSql(f: ListFilter, values: unknown[]): string {
	const where = [VISIBLE_SQL];
	const add = (column: string, value: string) => {
		values.push(value);
		where.push(`${column} = $${values.length}`);
	};
	if (f.category) add("category", f.category);
	if (f.level) add("level", f.level);
	if (f.stateSlug) add("state_slug", f.stateSlug);
	if (f.citySlug) add("city_slug", f.citySlug);
	if (f.remote) where.push("is_remote = true");
	if (f.titleSlug) add("title_slug", f.titleSlug);
	if (f.companySlug) add("company_slug", f.companySlug);
	return where.join(" AND ");
}

// Plain SQL through Payload's PostgreSQL pool. COUNT/numeric values come back as strings: cast in SQL.
// Note: `category`, `level` and `status` are PostgreSQL enums, so only pass valid keys to them.
async function sql<T>(text: string, values: unknown[] = []): Promise<T[]> {
	const payload = await payloadClient();
	const { pool } = payload.db as unknown as {
		pool: { query: (text: string, values?: unknown[]) => Promise<{ rows: T[] }> };
	};
	return (await pool.query(text, values)).rows;
}

// Thin-page minimum (CLAUDE.md section 9): 1 locally (.env.local), 3 in production.
export async function minJobsPerPage(): Promise<number> {
	const n = Number.parseInt(String(process.env.MIN_JOBS_PER_PAGE ?? ""), 10);
	return Number.isFinite(n) && n > 0 ? n : 3;
}

// ---- Site-wide counts ------------------------------------------------------------------------

export async function getSiteStats(): Promise<{ open: number; withPay: number; statesWithPages: number }> {
	const min = await minJobsPerPage();
	return cached("getSiteStats", [min], async () => {
		const [row] = await sql<{ open: number; with_pay: number; states: number }>(
			`SELECT COUNT(*)::int AS open,
            COUNT(*) FILTER (WHERE pay_min IS NOT NULL OR pay_max IS NOT NULL)::int AS with_pay,
            (SELECT COUNT(*)::int FROM (
               SELECT state_slug FROM jobs WHERE ${VISIBLE_SQL} AND state_slug IS NOT NULL
               GROUP BY state_slug HAVING COUNT(*) >= $1) s) AS states
     FROM jobs WHERE ${VISIBLE_SQL}`,
			[min],
		);
		return { open: row?.open ?? 0, withPay: row?.with_pay ?? 0, statesWithPages: row?.states ?? 0 };
	});
}

// Open jobs per category key.
export async function getCategoryCounts(): Promise<Record<string, number>> {
	return cached("getCategoryCounts", [], async () => {
		const rows = await sql<{ category: string; n: number }>(
			`SELECT category, COUNT(*)::int AS n FROM jobs WHERE ${VISIBLE_SQL} GROUP BY category`,
		);
		return Object.fromEntries(rows.map((r) => [r.category, r.n]));
	});
}

// Open jobs per level key.
export async function getLevelCounts(): Promise<Record<string, number>> {
	return cached("getLevelCounts", [], async () => {
		const rows = await sql<{ level: string; n: number }>(
			`SELECT level, COUNT(*)::int AS n FROM jobs WHERE ${VISIBLE_SQL} GROUP BY level`,
		);
		return Object.fromEntries(rows.map((r) => [r.level, r.n]));
	});
}

// States with at least MIN_JOBS_PER_PAGE open jobs, biggest first (key = state slug).
export async function getTopStates(limit: number): Promise<CountRow[]> {
	const min = await minJobsPerPage();
	return cached("getTopStates", [min, limit], () =>
		sql<CountRow>(
			`SELECT state_slug AS key, MIN(state) AS label, COUNT(*)::int AS count
     FROM jobs WHERE ${VISIBLE_SQL} AND state_slug IS NOT NULL
     GROUP BY state_slug HAVING COUNT(*) >= $1
     ORDER BY count DESC, label ASC LIMIT $2`,
			[min, limit],
		),
	);
}

// Open jobs per state, city, category, job title or company for a filter, keeping only groups with
// at least `min` jobs (default MIN_JOBS_PER_PAGE: pages that exist, so they may be linked).
// Biggest first. key = slug (or category key); label = name (state, city, clean title, company).
// "city" needs filter.stateSlug (city slugs are only unique within a state).
export async function getGroupCounts(
	by: "state" | "city" | "category" | "title" | "company",
	f: ListFilter = {},
	min?: number,
): Promise<CountRow[]> {
	const minimum = min ?? (await minJobsPerPage());
	return cached("getGroupCounts", [by, f, minimum], () => {
		const values: unknown[] = [];
		const where = filterSql(f, values);
		const [key, label] = {
			state: ["state_slug", "MIN(state)"],
			city: ["city_slug", "MIN(city)"],
			category: ["category::text", "category::text"],
			title: ["title_slug", "MIN(clean_title)"],
			company: ["company_slug", "MIN(company)"],
		}[by];
		values.push(minimum);
		return sql<CountRow>(
			`SELECT ${key} AS key, ${label} AS label, COUNT(*)::int AS count
     FROM jobs WHERE ${where} AND ${key} IS NOT NULL
     GROUP BY 1 HAVING COUNT(*) >= $${values.length}
     ORDER BY count DESC, label ASC`,
			values,
		);
	});
}

export async function countJobs(f: ListFilter): Promise<number> {
	return cached("countJobs", [f], async () => {
		const payload = await payloadClient();
		const { totalDocs } = await payload.count({ collection: "jobs", where: filterWhere(f) });
		return totalDocs;
	});
}

// State and city names for slugs (from open jobs), e.g. { state: "Texas", city: "Austin" }.
export async function getPlaceNames(
	stateSlug: string,
	citySlug?: string,
): Promise<{ state: string | null; city: string | null }> {
	return cached("getPlaceNames", [stateSlug, citySlug ?? null], async () => {
		const [row] = await sql<{ state: string | null; city: string | null }>(
			`SELECT MIN(state) AS state, MIN(city) FILTER (WHERE city_slug = $2) AS city
     FROM jobs WHERE ${VISIBLE_SQL} AND state_slug = $1`,
			[stateSlug, citySlug ?? null],
		);
		return { state: row?.state ?? null, city: row?.city ?? null };
	});
}

// /locations: states with their cities, both only when they have MIN_JOBS_PER_PAGE+ open jobs.
export async function getLocations(): Promise<(CountRow & { cities: CountRow[] })[]> {
	const min = await minJobsPerPage();
	return cached("getLocations", [min], async () => {
		const [states, cities] = await Promise.all([
			getGroupCounts("state"),
			sql<CountRow & { state_slug: string }>(
				`SELECT state_slug, city_slug AS key, MIN(city) AS label, COUNT(*)::int AS count
       FROM jobs WHERE ${VISIBLE_SQL} AND state_slug IS NOT NULL AND city_slug IS NOT NULL
       GROUP BY state_slug, city_slug HAVING COUNT(*) >= $1
       ORDER BY count DESC, label ASC`,
				[min],
			),
		]);
		return states.map((s) => ({
			...s,
			cities: cities.filter((c) => c.state_slug === s.key).map(({ key, label, count }) => ({ key, label, count })),
		}));
	});
}

// ---- Job lists -------------------------------------------------------------------------------

// One page of a list page's jobs, newest first, plus the total number of matching jobs.
export async function getJobList(
	f: ListFilter,
	page: number,
	perPage: number,
): Promise<{ jobs: JobCardRow[]; total: number }> {
	return cached("getJobList", [f, page, perPage], async () => {
		const payload = await payloadClient();
		const { docs, totalDocs } = await payload.find({
			collection: "jobs",
			where: filterWhere(f),
			sort: ["-datePosted", "-id"],
			limit: perPage,
			page,
			depth: 0,
			select: CARD_SELECT,
		});
		return { jobs: (docs as JobDoc[]).map(toCard), total: totalDocs };
	});
}

export async function getLatestJobs(limit: number): Promise<JobCardRow[]> {
	return cached("getLatestJobs", [limit], async () => {
		const payload = await payloadClient();
		const { docs } = await payload.find({
			collection: "jobs",
			where: VISIBLE,
			sort: "-datePosted",
			limit,
			depth: 0,
			select: CARD_SELECT,
		});
		return (docs as JobDoc[]).map(toCard);
	});
}

// Similar open jobs: same category, same state first (then the rest of the US), newest first.
// Cache key: only the job fields the queries use (not the whole job with its long description).
export async function getSimilarJobs(job: Job, limit: number): Promise<JobCardRow[]> {
	return cached("getSimilarJobs", [job.id, job.category, job.state_slug, limit], async () => {
		const payload = await payloadClient();
		const base: Where[] = [VISIBLE, { category: { equals: job.category } }, { id: { not_equals: job.id } }];
		const sameState = await payload.find({
			collection: "jobs",
			where: { and: [...base, job.state_slug ? { stateSlug: { equals: job.state_slug } } : { stateSlug: { exists: false } }] },
			sort: "-datePosted",
			limit,
			depth: 0,
			select: CARD_SELECT,
		});
		const found = sameState.docs as JobDoc[];
		if (found.length < limit) {
			const rest = await payload.find({
				collection: "jobs",
				where: { and: [...base, { id: { not_in: found.map((d) => d.id) } }] },
				sort: "-datePosted",
				limit: limit - found.length,
				depth: 0,
				select: CARD_SELECT,
			});
			found.push(...(rest.docs as JobDoc[]));
		}
		return found.map(toCard);
	});
}

// ---- One job ---------------------------------------------------------------------------------

// cache(): the job page and its generateMetadata share one query per request.
// Hidden jobs are not returned (their page is a 404).
export const getJobBySlug = cache(async (slug: string): Promise<Job | null> => {
	return cached("getJobBySlug", [slug], async () => {
		const payload = await payloadClient();
		const { docs } = await payload.find({
			collection: "jobs",
			where: { slug: { equals: slug }, hidden: { equals: false } },
			limit: 1,
			depth: 0,
		});
		return docs[0] ? toJob(docs[0] as JobDoc) : null;
	});
});

// Open-job counts for a category in the job's state and city, to decide which place pages
// exist (thin-page rule) and may be linked to.
export async function getCategoryPlaceCounts(
	category: string,
	stateSlug: string | null,
	citySlug: string | null,
): Promise<{ state: number; city: number }> {
	if (!stateSlug) return { state: 0, city: 0 };
	return cached("getCategoryPlaceCounts", [category, stateSlug, citySlug], async () => {
		const [row] = await sql<{ state: number; city: number }>(
			`SELECT COUNT(*)::int AS state,
            COUNT(*) FILTER (WHERE city_slug IS NOT DISTINCT FROM $3)::int AS city
     FROM jobs WHERE ${VISIBLE_SQL} AND category = $1 AND state_slug = $2`,
			[category, stateSlug, citySlug],
		);
		return { state: row?.state ?? 0, city: citySlug ? (row?.city ?? 0) : 0 };
	});
}

// ---- Pay -------------------------------------------------------------------------------------

// Low / median / high yearly pay over open jobs that state pay (filters are optional).
// Low = lowest stated figure, high = highest; median uses each job's midpoint.
export async function getPayStats(filters: ListFilter): Promise<PayStats | null> {
	return cached("getPayStats", [filters], async () => {
		const values: unknown[] = [];
		const where = filterSql(filters, values);
		const rows = await sql<{ pay_min: number | null; pay_max: number | null }>(
			`SELECT pay_min::float8 AS pay_min, pay_max::float8 AS pay_max FROM jobs WHERE ${where}`,
			values,
		);

		const paid = rows.filter((r) => r.pay_min || r.pay_max);
		if (paid.length === 0) return null;
		const mids = paid.map((r) => payMidpoint(r.pay_min, r.pay_max)!).sort((a, b) => a - b);
		const half = Math.floor(mids.length / 2);
		return {
			low: Math.min(...paid.map((r) => (r.pay_min || r.pay_max)!)),
			high: Math.max(...paid.map((r) => (r.pay_max || r.pay_min)!)),
			median: Math.round(mids.length % 2 ? mids[half] : (mids[half - 1] + mids[half]) / 2),
			withPay: paid.length,
			total: rows.length,
		};
	});
}

export type PayGroupRow = PayStats & { key: string; label: string };

// Pay per category or per state (same figures as getPayStats), only for groups where at least
// `minWithPay` open jobs state pay. total = all open jobs in the group (with or without pay).
export async function getPayByGroup(by: "category" | "state", f: ListFilter, minWithPay: number): Promise<PayGroupRow[]> {
	return cached("getPayByGroup", [by, f, minWithPay], () => {
		const values: unknown[] = [];
		const where = filterSql(f, values);
		const [key, label] = by === "state" ? ["state_slug", "MIN(state)"] : ["category::text", "category::text"];
		values.push(minWithPay);
		const paid = "(pay_min > 0 OR pay_max > 0)";
		return sql<PayGroupRow>(
			`SELECT ${key} AS key, ${label} AS label,
            MIN(COALESCE(NULLIF(pay_min, 0), pay_max)) FILTER (WHERE ${paid})::float8 AS low,
            MAX(COALESCE(NULLIF(pay_max, 0), pay_min)) FILTER (WHERE ${paid})::float8 AS high,
            ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY
              (COALESCE(NULLIF(pay_min, 0), pay_max) + COALESCE(NULLIF(pay_max, 0), pay_min)) / 2.0)
              FILTER (WHERE ${paid}))::float8 AS median,
            (COUNT(*) FILTER (WHERE ${paid}))::int AS "withPay",
            COUNT(*)::int AS total
     FROM jobs WHERE ${where} AND ${key} IS NOT NULL
     GROUP BY 1 HAVING COUNT(*) FILTER (WHERE ${paid}) >= $${values.length}
     ORDER BY "withPay" DESC, label ASC`,
			values,
		);
	});
}

// Company details for its page, from its newest open job (null when it has no open jobs).
export async function getCompanyInfo(companySlug: string): Promise<{
	company: string;
	logo: string | null;
	industry: string | null;
	size: string | null;
} | null> {
	return cached("getCompanyInfo", [companySlug], async () => {
		const payload = await payloadClient();
		const { docs } = await payload.find({
			collection: "jobs",
			where: filterWhere({ companySlug }),
			sort: "-datePosted",
			limit: 1,
			depth: 0,
			select: { company: true, logo: true, companyIndustry: true, companySize: true },
		});
		const d = docs[0] as JobDoc | undefined;
		if (!d?.company) return null;
		return { company: d.company, logo: d.logo ?? null, industry: d.companyIndustry ?? null, size: d.companySize ?? null };
	});
}

// ---- Sitemap ---------------------------------------------------------------------------------

// Every state / city page (all finance and per category) with at least MIN_JOBS_PER_PAGE open jobs.
// category null = /finance-jobs/...; city null = the state page.
export async function getSitemapPlaces(): Promise<{ category: string | null; state: string; city: string | null }[]> {
	const min = await minJobsPerPage();
	return cached("getSitemapPlaces", [min], () =>
		sql<{ category: string | null; state: string; city: string | null }>(
			`SELECT category, state, city FROM (
       SELECT CASE WHEN GROUPING(category) = 1 THEN NULL ELSE category::text END AS category,
              state_slug AS state,
              CASE WHEN GROUPING(city_slug) = 1 THEN NULL ELSE city_slug END AS city,
              GROUPING(city_slug) AS no_city, city_slug AS raw_city
       FROM jobs WHERE ${VISIBLE_SQL} AND state_slug IS NOT NULL
       GROUP BY GROUPING SETS ((state_slug), (state_slug, city_slug), (category, state_slug), (category, state_slug, city_slug))
       HAVING COUNT(*) >= $1
     ) g WHERE no_city = 1 OR raw_city IS NOT NULL`,
			[min],
		),
	);
}

// Every open, non-hidden job: slug + last change (sitemap).
export async function getSitemapJobs(): Promise<{ slug: string; updatedAt: string }[]> {
	return cached("getSitemapJobs", [], async () => {
		const payload = await payloadClient();
		const { docs } = await payload.find({
			collection: "jobs",
			where: VISIBLE,
			pagination: false,
			depth: 0,
			select: { slug: true, updatedAt: true },
		});
		return (docs as JobDoc[]).map((d) => ({ slug: d.slug, updatedAt: d.updatedAt }));
	});
}

// ---- CMS text --------------------------------------------------------------------------------

export type CategoryPageText = { intro: string | null; seoTitle: string | null; seoDescription: string | null };

// Admin-written intro / SEO text for a category (CategoryPages collection); empty fields -> null.
export const getCategoryPageText = cache(async (key: string): Promise<CategoryPageText> => {
	return cached("getCategoryPageText", [key], async () => {
		const payload = await payloadClient();
		const { docs } = await payload.find({
			collection: "category-pages",
			where: { key: { equals: key } },
			limit: 1,
			depth: 0,
		});
		const d = docs[0];
		const text = (v: string | null | undefined) => v?.trim() || null;
		return { intro: text(d?.intro), seoTitle: text(d?.seoTitle), seoDescription: text(d?.seoDescription) };
	});
});

export type SiteText = { homeHeadline: string | null; homeSubline: string | null; defaultSeoDescription: string | null };

// Admin-written home page text (SiteText global); empty fields -> null (the page keeps its own text).
// cache(): the home page and its generateMetadata share one read per request.
export const getSiteText = cache(async (): Promise<SiteText> => {
	return cached("getSiteText", [], async () => {
		const payload = await payloadClient();
		const d = await payload.findGlobal({ slug: "site-text", depth: 0 });
		const text = (v: string | null | undefined) => v?.trim() || null;
		return {
			homeHeadline: text(d?.homeHeadline),
			homeSubline: text(d?.homeSubline),
			defaultSeoDescription: text(d?.defaultSeoDescription),
		};
	});
});

export function payMidpoint(min: number | null, max: number | null): number | null {
	if (min && max) return (min + max) / 2;
	return min || max || null;
}
