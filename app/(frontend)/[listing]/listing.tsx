// Shared by the three list-page routes (CLAUDE.md section 9):
//   [listing]/page.tsx                 /finance-jobs, /<category>-jobs, /<level>-level-finance-jobs
//   [listing]/[place]/page.tsx         .../<state> or .../remote
//   [listing]/[place]/[city]/page.tsx  .../<state>/<city>
// loadListing() reads the URL, applies the 404 rules (unknown slug, thin page, page past the end)
// and loads everything the page and its metadata need. It is wrapped in cache(), so
// generateMetadata and the page share one set of queries per request.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import Breadcrumbs, { type Crumb } from "@/components/Breadcrumbs";
import JobCard from "@/components/JobCard";
import ListFacts from "@/components/ListFacts";
import PayStrip, { MIN_PAY_LISTINGS } from "@/components/PayStrip";
import PlaceLinks from "@/components/PlaceLinks";
import type { SidebarLink } from "@/components/SidebarBox";
import {
	countJobs,
	getCategoryCounts,
	getCategoryPageText,
	getGroupCounts,
	getJobList,
	getLevelCounts,
	getListFacts,
	getPayStats,
	getPlaceNames,
	minJobsPerPage,
	type CountRow,
	type JobCardRow,
	type ListFacts as ListFactsData,
	type ListFilter,
	type PayStats,
} from "@/lib/db";
import {
	CATEGORY_LIST,
	categoryInfo,
	cityStateLabel,
	LEVELS,
	levelLabel,
	levelPath,
	type CategoryInfo,
} from "@/lib/format";
import { canonicalUrl, listDescription, listIntro, listMetaTitle, listTitle, pageSuffix, socialMetadata } from "@/lib/seo";

export const PER_PAGE = 50;
const TOP_PLACES_IN_INTRO = 3;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// ---- What the first URL segment means ----------------------------------------------------------

type Scope = {
	path: string; // "/fpa-jobs"
	filter: ListFilter;
	what: string; // "FP&A Jobs" (titles)
	whatLower: string; // "FP&A jobs" (sentences)
	role: string; // "FP&A" (sidebar headings, breadcrumbs)
	category: CategoryInfo | null;
	isLevel: boolean;
	salary: { href: string; label: string };
};

function parseScope(slug: string): Scope | null {
	if (slug === "finance-jobs") {
		return {
			path: "/finance-jobs",
			filter: {},
			what: "Finance Jobs",
			whatLower: "finance jobs",
			role: "Finance",
			category: null,
			isLevel: false,
			salary: { href: "/salaries", label: "Finance salaries" },
		};
	}
	const cat = CATEGORY_LIST.find((c) => c.path === `/${slug}`);
	if (cat) {
		return {
			path: cat.path,
			filter: { category: cat.key },
			what: `${cat.label} Jobs`,
			whatLower: `${cat.label} jobs`,
			role: cat.shortLabel,
			category: cat,
			isLevel: false,
			salary: { href: `/salaries/${cat.key}`, label: `${cat.shortLabel} salaries` },
		};
	}
	const level = LEVELS.find((l) => levelPath(l) === `/${slug}`);
	if (level) {
		const name = levelLabel(level); // "Entry"
		return {
			path: levelPath(level),
			filter: { level },
			what: `${name} Level Finance Jobs`,
			whatLower: `${name.toLowerCase()} level finance jobs`,
			role: `${name} level finance`,
			category: null,
			isLevel: true,
			salary: { href: "/salaries", label: "Finance salaries" },
		};
	}
	return null;
}

// ---- Loading -----------------------------------------------------------------------------------

export type Box = { id: string; title: string; links: SidebarLink[]; variant?: "list" | "pills" | "grid"; more?: SidebarLink };

export type ListingData = {
	path: string; // canonical path, e.g. "/fpa-jobs/texas/austin"
	page: number;
	totalPages: number;
	total: number;
	jobs: JobCardRow[];
	h1: string;
	seoTitle: string | null; // admin-written (national category page only)
	description: string;
	intro: string;
	crumbs: Crumb[];
	pay: PayStats | null;
	salary: { href: string; label: string };
	boxes: Box[];
	noindex?: boolean; // page stays for visitors but is not indexed (thin company pages)
	// "At a glance" box: which rows make sense on this page type.
	facts?: { data: ListFactsData; show: { levels: boolean; remote: boolean; companies: boolean } };
};

// ?page=… -> "2", null when absent, "" (invalid) when given twice.
export function pageParam(searchParams: Record<string, string | string[] | undefined>): string | null {
	const p = searchParams.page;
	if (p === undefined) return null;
	return typeof p === "string" ? p : "";
}

// "2" -> 2, absent -> 1; anything else is a 404.
export function parsePage(pageText: string | null): number {
	if (pageText !== null && !/^[1-9]\d{0,4}$/.test(pageText)) notFound();
	return pageText ? Number(pageText) : 1;
}

export function totalPagesFor(total: number): number {
	return Math.max(1, Math.ceil(total / PER_PAGE));
}

export const loadListing = cache(
	async (listing: string, place: string | null, city: string | null, pageText: string | null): Promise<ListingData> => {
		const scope = parseScope(listing);
		if (!scope) notFound();
		// Level pages have no place sub-pages in week 1; cities exist only under a state.
		if (scope.isLevel && place !== null) notFound();
		const remote = place === "remote";
		if (remote && city !== null) notFound();
		if (place !== null && !SLUG.test(place)) notFound();
		if (city !== null && !SLUG.test(city)) notFound();
		const page = parsePage(pageText);

		const filter: ListFilter = { ...scope.filter };
		if (remote) filter.remote = true;
		else if (place !== null) {
			filter.stateSlug = place;
			if (city !== null) filter.citySlug = city;
		}

		const [min, list, names] = await Promise.all([
			minJobsPerPage(),
			getJobList(filter, page, PER_PAGE),
			place !== null && !remote ? getPlaceNames(place, city ?? undefined) : null,
		]);

		// Thin-page rule: state, city and remote pages need MIN_JOBS_PER_PAGE open jobs.
		// /finance-jobs/remote always exists (linked from the site-wide footer), like national pages.
		const alwaysExists = place === null || (remote && scope.category === null);
		if (!alwaysExists && list.total < min) notFound();
		if (names && (!names.state || (city !== null && !names.city))) notFound();
		const totalPages = totalPagesFor(list.total);
		if (page > totalPages) notFound();

		const state = names?.state ?? null;
		const cityName = names?.city ?? null;
		const statePath = place !== null ? `${scope.path}/${place}` : scope.path;
		const path = city !== null ? `${statePath}/${city}` : statePath;

		// H1: "FP&A Jobs in Austin, TX", "Remote Finance Jobs in the US" (the <title> adds the count).
		const what = remote ? `Remote ${scope.what}` : scope.what;
		const whatLower = remote ? `remote ${scope.whatLower}` : scope.whatLower;
		const placeShort = state ? cityStateLabel(cityName, state) : null;
		const placeLong = state ? (cityName ? `${cityName}, ${state}` : state) : null;
		const h1 = listTitle(what, placeShort);

		const crumbs: Crumb[] = [{ label: `${scope.role} jobs`, href: place !== null ? scope.path : undefined }];
		if (remote) crumbs.push({ label: "Remote" });
		if (state) crumbs.push({ label: state, href: cityName ? statePath : undefined });
		if (cityName) crumbs.push({ label: cityName });

		const [pay, cms, sidebar, facts] = await Promise.all([
			getPayStats(filter),
			scope.category && place === null ? getCategoryPageText(scope.category.key) : null,
			loadSidebar(scope, filter, { place, city, remote, state, cityName, min }),
			getListFacts(filter),
		]);
		const employers = facts.topCompanies.map((c) => c.label);

		return {
			path,
			page,
			totalPages,
			total: list.total,
			jobs: list.jobs,
			h1,
			seoTitle: cms?.seoTitle ?? null,
			description: cms?.seoDescription ?? listDescription(list.total, whatLower, placeLong, pay, employers),
			intro: cms?.intro ?? listIntro(list.total, whatLower, placeLong, sidebar.topPlaces),
			crumbs,
			pay: pay && pay.withPay >= MIN_PAY_LISTINGS ? pay : null,
			salary: scope.salary,
			boxes: sidebar.boxes,
			facts: { data: facts, show: { levels: !scope.isLevel, remote: !remote, companies: true } },
		};
	},
);

// Internal links (only to pages that pass the thin-page rule) + the top places for the intro.
async function loadSidebar(
	scope: Scope,
	filter: ListFilter,
	p: { place: string | null; city: string | null; remote: boolean; state: string | null; cityName: string | null; min: number },
): Promise<{ boxes: Box[]; topPlaces: string[] }> {
	const role = scope.role;
	const cat = scope.category;
	const toLinks = (rows: CountRow[], href: (key: string) => string): SidebarLink[] =>
		rows.map((r) => ({ href: href(r.key), label: r.label, count: r.count }));
	// Category count rows -> links to the same place under each other category.
	const categoryLinks = (rows: CountRow[], suffix: string): SidebarLink[] =>
		rows
			.filter((r) => r.key !== cat?.key)
			.map((r) => {
				const c = categoryInfo(r.key)!;
				return { href: `${c.path}${suffix}`, label: c.shortLabel, count: r.count };
			});

	// Level page (US only).
	if (scope.isLevel) {
		const [levels, cats] = await Promise.all([getLevelCounts(), getCategoryCounts()]);
		return {
			topPlaces: [],
			boxes: [
				{
					id: "levels",
					title: "Other experience levels",
					variant: "pills",
					links: LEVELS.filter((l) => filter.level !== l && levels[l]).map((l) => ({
						href: levelPath(l),
						label: levelLabel(l, true),
					})),
				},
				{ id: "roles", title: "Finance jobs by role", links: nationalRoleLinks(cats) },
			],
		};
	}

	// National page: by state.
	if (p.place === null) {
		const [states, remoteCount, cats] = await Promise.all([
			getGroupCounts("state", filter),
			countJobs({ ...filter, remote: true }),
			getCategoryCounts(),
		]);
		const stateLinks = toLinks(states, (k) => `${scope.path}/${k}`);
		if (remoteCount >= (cat ? p.min : 1)) {
			stateLinks.push({ href: `${scope.path}/remote`, label: "Remote (US)", count: remoteCount });
		}
		const roleLinks = nationalRoleLinks(cats).filter((l) => l.href !== cat?.path);
		return {
			topPlaces: states.slice(0, TOP_PLACES_IN_INTRO).map((s) => s.label),
			boxes: [
				{
					id: "by-place",
					title: `${role} jobs by state`,
					links: stateLinks,
					more: cat ? undefined : { href: "/locations", label: "All locations" },
				},
				cat
					? {
							id: "roles",
							title: "Other finance roles",
							variant: "pills",
							links: [...roleLinks, { href: "/finance-jobs", label: "All finance jobs" }],
						}
					: { id: "roles", title: "Finance jobs by role", links: roleLinks },
			],
		};
	}

	// Remote page.
	if (p.remote) {
		const cats = await getGroupCounts("category", { remote: true });
		const links = categoryLinks(cats, "/remote");
		if (cat) links.push({ href: "/finance-jobs/remote", label: "All remote finance jobs" });
		return {
			topPlaces: [],
			boxes: [
				{ id: "by-role", title: "Other remote finance jobs", links },
				{
					id: "us",
					title: `${role} jobs in the US`,
					variant: "pills",
					links: [
						{ href: scope.path, label: `All US ${scope.whatLower}` },
						{ href: "/locations", label: "All locations" },
					],
				},
			],
		};
	}

	const stateSlug = p.place;
	const statePath = `${scope.path}/${stateSlug}`;

	// State page: by city, other roles in the state, other states.
	if (p.city === null) {
		const [cities, cats, states, remoteCount] = await Promise.all([
			getGroupCounts("city", filter),
			getGroupCounts("category", { stateSlug }),
			getGroupCounts("state", scope.filter),
			countJobs({ ...scope.filter, remote: true }),
		]);
		const roleLinks: SidebarLink[] = categoryLinks(cats, `/${stateSlug}`).map(({ href, label }) => ({ href, label }));
		if (cat) roleLinks.push({ href: `/finance-jobs/${stateSlug}`, label: `All finance jobs in ${p.state}` });
		const otherStates: SidebarLink[] = states
			.filter((s) => s.key !== stateSlug)
			.map((s) => ({ href: `${scope.path}/${s.key}`, label: s.label }));
		if (remoteCount >= (cat ? p.min : 1)) otherStates.push({ href: `${scope.path}/remote`, label: "Remote (US)" });
		otherStates.push({ href: scope.path, label: "All US" });
		return {
			topPlaces: cities.slice(0, TOP_PLACES_IN_INTRO).map((c) => c.label),
			boxes: [
				{
					id: "by-place",
					title: `${role} jobs by city in ${p.state}`,
					links: toLinks(cities, (k) => `${statePath}/${k}`),
				},
				{ id: "roles", title: `Other finance jobs in ${p.state}`, variant: "pills", links: roleLinks },
				{ id: "states", title: `${role} jobs in other states`, variant: "grid", links: otherStates },
			],
		};
	}

	// City page: other roles in the city, back to the state, other cities in the state.
	const citySlug = p.city;
	const [cats, cities] = await Promise.all([
		getGroupCounts("category", { stateSlug, citySlug }),
		getGroupCounts("city", { ...scope.filter, stateSlug }),
	]);
	const roleLinks = categoryLinks(cats, `/${stateSlug}/${citySlug}`);
	if (cat) roleLinks.push({ href: `/finance-jobs/${stateSlug}/${citySlug}`, label: `All finance jobs in ${p.cityName}` });
	return {
		topPlaces: [],
		boxes: [
			{ id: "roles", title: `Other finance jobs in ${p.cityName}`, links: roleLinks },
			{
				id: "back",
				title: `More ${role} jobs`,
				variant: "pills",
				links: [
					{ href: statePath, label: `${role} jobs in ${p.state}` },
					{ href: scope.path, label: `All US ${scope.whatLower}` },
				],
			},
			{
				id: "cities",
				title: `${role} jobs in other ${p.state} cities`,
				variant: "grid",
				links: cities.filter((c) => c.key !== citySlug).map((c) => ({ href: `${statePath}/${c.key}`, label: c.label })),
			},
		],
	};
}

// National category pages always exist; link the ones that have jobs.
export function nationalRoleLinks(counts: Record<string, number>): SidebarLink[] {
	return CATEGORY_LIST.filter((c) => counts[c.key])
		.sort((a, b) => counts[b.key] - counts[a.key])
		.map((c) => ({ href: c.path, label: c.shortLabel, count: counts[c.key] }));
}

// ---- Metadata (SEO rules 1–2) --------------------------------------------------------------

// <title>: the admin's SEO title, else "FP&A Jobs in Austin, TX: 37 Open Roles" (keyword first).
export function listingMetadata(d: ListingData): Metadata {
	const title = (d.seoTitle ?? listMetaTitle(d.h1, d.total)) + pageSuffix(d.page);
	return {
		title,
		description: d.description,
		alternates: { canonical: canonicalUrl(d.path, d.page) },
		...socialMetadata(title, d.description, d.path, { page: d.page }),
		...(d.noindex ? { robots: { index: false, follow: true } } : {}),
	};
}

// ---- Page ----------------------------------------------------------------------------------

export function ListingPage({ data: d }: { data: ListingData }) {
	return (
		<>
			{/* White top band */}
			<section className="border-b border-border bg-surface">
				<div className="mx-auto flex max-w-[1200px] flex-col gap-3.5 px-6 pb-[30px] pt-[22px]">
					<Breadcrumbs items={d.crumbs} path={d.path} />
					<h1 className="text-[30px] font-bold leading-[1.15] tracking-[-0.02em] sm:text-[38px]">{d.h1}</h1>
					<p className="max-w-[720px] text-[17px] leading-normal text-text-2">{d.intro}</p>
					{d.pay && <PayStrip stats={d.pay} salaryHref={d.salary.href} salaryLabel={d.salary.label} />}
				</div>
			</section>

			<main className="mx-auto flex max-w-[1200px] flex-wrap items-start gap-8 px-6 pb-16 pt-8">
				<div className="flex min-w-0 flex-[999_1_560px] flex-col gap-3.5">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<h2 className="text-lg font-semibold">
							{d.total} {d.total === 1 ? "job" : "jobs"} <span className="font-normal text-muted">· newest first</span>
						</h2>
						<span className="text-sm text-muted">
							Page {d.page} of {d.totalPages}
						</span>
					</div>
					{d.jobs.length === 0 ? (
						<p className="rounded-[10px] border border-border bg-surface p-5 text-text-2">No open jobs here yet.</p>
					) : (
						d.jobs.map((job) => <JobCard key={job.id} job={job} variant="full" />)
					)}
					<Pagination path={d.path} page={d.page} totalPages={d.totalPages} />
				</div>

				<aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-5">
					{d.facts && <ListFacts facts={d.facts.data} show={d.facts.show} />}
					{d.boxes.map((b) => (
						<PlaceLinks key={b.id} {...b} />
					))}
				</aside>
			</main>
		</>
	);
}

function Pagination({ path, page, totalPages }: { path: string; page: number; totalPages: number }) {
	if (totalPages <= 1) return null;
	const href = (n: number) => (n === 1 ? path : `${path}?page=${n}`);
	const button = "rounded-lg border border-border-strong bg-surface px-[18px] py-3 text-[15px] font-semibold text-ink";
	return (
		<nav aria-label="Pages" className="mt-2 flex flex-wrap items-center gap-3">
			{page > 1 && (
				<Link href={href(page - 1)} rel="prev" className={button}>
					← Newer jobs
				</Link>
			)}
			{page < totalPages && (
				<Link href={href(page + 1)} rel="next" className={button}>
					Older jobs →
				</Link>
			)}
		</nav>
	);
}
