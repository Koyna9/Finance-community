import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { MIN_PAY_LISTINGS } from "@/components/PayStrip";
import { getCompanyInfo, getGroupCounts, getJobList, getPayStats, minJobsPerPage } from "@/lib/db";
import { categoryInfo } from "@/lib/format";
import { companyDescription, companyIntro, companyTitle } from "@/lib/seo";
import {
	ListingPage,
	listingMetadata,
	pageParam,
	parsePage,
	PER_PAGE,
	totalPagesFor,
	type ListingData,
} from "../../[listing]/listing";

// /companies/<company-slug>: the company's open jobs (CLAUDE.md section 9).
// Exists while the company has at least one open job (the /companies index lists the same), because
// its job pages link to it. With fewer than MIN_JOBS_PER_PAGE open jobs it is a thin page: it stays
// for visitors but gets "noindex, follow" and is left out of the sitemap.
export const dynamic = "force-dynamic";

const TOP_PLACES_IN_INTRO = 3;
const OTHER_COMPANIES = 10;

type Props = {
	params: Promise<{ company: string }>;
	searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const loadCompany = cache(async (companySlug: string, pageText: string | null): Promise<ListingData> => {
	if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(companySlug)) notFound();
	const page = parsePage(pageText);
	const filter = { companySlug };
	const [info, list] = await Promise.all([getCompanyInfo(companySlug), getJobList(filter, page, PER_PAGE)]);
	if (!info || list.total === 0) notFound();
	const totalPages = totalPagesFor(list.total);
	if (page > totalPages) notFound();

	const [pay, states, categories, companies, min] = await Promise.all([
		getPayStats(filter),
		getGroupCounts("state", filter, 1),
		getGroupCounts("category", filter, 1),
		getGroupCounts("company", {}, 1),
		minJobsPerPage(),
	]);
	// LinkedIn size already reads like "501-1,000 employees".
	const size = info.size ? (/employees/i.test(info.size) ? info.size : `${info.size} employees`) : null;
	const details = [info.industry, size].filter(Boolean).join(" · ");

	return {
		path: `/companies/${companySlug}`,
		page,
		totalPages,
		total: list.total,
		jobs: list.jobs,
		h1: companyTitle(list.total, info.company),
		seoTitle: null,
		description: companyDescription(list.total, info.company, info.industry, pay),
		intro:
			companyIntro(list.total, info.company, states.slice(0, TOP_PLACES_IN_INTRO).map((s) => s.label)) +
			(details ? ` ${details}.` : ""),
		crumbs: [{ label: "Companies", href: "/companies" }, { label: info.company }],
		pay: pay && pay.withPay >= MIN_PAY_LISTINGS ? pay : null,
		salary: { href: "/salaries", label: "Finance salaries" },
		boxes: [
			{
				id: "roles",
				title: `Roles ${info.company} is hiring for`,
				variant: "pills",
				links: categories.map((c) => {
					const cat = categoryInfo(c.key)!;
					return { href: cat.path, label: `${cat.shortLabel} jobs` };
				}),
			},
			{
				id: "companies",
				title: "Other companies hiring",
				links: companies
					.filter((c) => c.key !== companySlug)
					.slice(0, OTHER_COMPANIES)
					.map((c) => ({ href: `/companies/${c.key}`, label: c.label, count: c.count })),
				more: { href: "/companies", label: "All companies" },
			},
		],
		noindex: list.total < min,
	};
});

async function load({ params, searchParams }: Props) {
	return loadCompany((await params).company, pageParam(await searchParams));
}

export async function generateMetadata(props: Props): Promise<Metadata> {
	return listingMetadata(await load(props));
}

export default async function CompanyPage(props: Props) {
	return <ListingPage data={await load(props)} />;
}
