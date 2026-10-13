import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { MIN_PAY_LISTINGS } from "@/components/PayStrip";
import { getGroupCounts, getJobList, getListFacts, getPayStats, getTitleSalaries, minJobsPerPage } from "@/lib/db";
import { categoryInfo } from "@/lib/format";
import { listDescription, listIntro, listTitle } from "@/lib/seo";
import {
	ListingPage,
	listingMetadata,
	pageParam,
	parsePage,
	PER_PAGE,
	totalPagesFor,
	type ListingData,
} from "../../[listing]/listing";

// /titles/<title-slug>: open jobs with that clean title, US-wide (CLAUDE.md section 9).
// Exists only with MIN_JOBS_PER_PAGE+ open jobs (thin-page rule), like /titles lists it.
export const dynamic = "force-dynamic";

const TOP_PLACES_IN_INTRO = 3;
const OTHER_TITLES = 10;

type Props = {
	params: Promise<{ title: string }>;
	searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const loadTitle = cache(async (titleSlug: string, pageText: string | null): Promise<ListingData> => {
	if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(titleSlug)) notFound();
	const page = parsePage(pageText);
	const filter = { titleSlug };
	const [min, list] = await Promise.all([minJobsPerPage(), getJobList(filter, page, PER_PAGE)]);
	if (list.total < min) notFound();
	const totalPages = totalPagesFor(list.total);
	if (page > totalPages || list.jobs.length === 0) notFound();

	const name = list.jobs[0].clean_title; // "Financial Analyst"
	const [pay, states, titles, categories, facts, titleSalaries] = await Promise.all([
		getPayStats(filter),
		getGroupCounts("state", filter, 1),
		getGroupCounts("title"),
		getGroupCounts("category", filter, 1),
		getListFacts(filter),
		getTitleSalaries(MIN_PAY_LISTINGS),
	]);
	const hasSalaryPage = titleSalaries.some((t) => t.key === titleSlug);
	const employers = facts.topCompanies.map((c) => c.label);
	return {
		path: `/titles/${titleSlug}`,
		page,
		totalPages,
		total: list.total,
		jobs: list.jobs,
		h1: listTitle(`${name} Jobs`, null),
		seoTitle: null,
		description: listDescription(list.total, `${name} jobs`, null, pay, employers),
		intro: listIntro(list.total, `${name} jobs`, null, states.slice(0, TOP_PLACES_IN_INTRO).map((s) => s.label)),
		crumbs: [{ label: "Job titles", href: "/titles" }, { label: name }],
		pay: pay && pay.withPay >= MIN_PAY_LISTINGS ? pay : null,
		// The title's own salary page when it has one; else the overview (a title can span roles).
		salary: hasSalaryPage
			? { href: `/salaries/titles/${titleSlug}`, label: `${name} salary` }
			: { href: "/salaries", label: "Finance salaries" },
		boxes: [
			{
				id: "roles",
				title: `Browse ${name} roles by type`,
				variant: "pills",
				links: categories.map((c) => {
					const info = categoryInfo(c.key)!;
					return { href: info.path, label: `${info.shortLabel} jobs` };
				}),
			},
			{
				id: "titles",
				title: "Other job titles",
				links: titles
					.filter((t) => t.key !== titleSlug)
					.slice(0, OTHER_TITLES)
					.map((t) => ({ href: `/titles/${t.key}`, label: t.label, count: t.count })),
				more: { href: "/titles", label: "All job titles" },
			},
		],
		facts: { data: facts, show: { levels: true, remote: true, companies: true } },
	};
});

async function load({ params, searchParams }: Props) {
	return loadTitle((await params).title, pageParam(await searchParams));
}

export async function generateMetadata(props: Props): Promise<Metadata> {
	return listingMetadata(await load(props));
}

export default async function TitlePage(props: Props) {
	return <ListingPage data={await load(props)} />;
}
