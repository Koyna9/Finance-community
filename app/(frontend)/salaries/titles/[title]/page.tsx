import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import Breadcrumbs from "@/components/Breadcrumbs";
import JobCard from "@/components/JobCard";
import PayMethod from "@/components/PayMethod";
import PayStrip, { MIN_PAY_LISTINGS } from "@/components/PayStrip";
import PayTable from "@/components/PayTable";
import PlaceLinks from "@/components/PlaceLinks";
import { getPayByGroup, getPayListings, getPayStats, getTitleSalaries, minJobsPerPage } from "@/lib/db";
import { categoryInfo, LEVELS, levelLabel, shortUsd } from "@/lib/format";
import { canonicalUrl, socialMetadata } from "@/lib/seo";

// /salaries/titles/<title-slug>: yearly pay for one job title, e.g. "Staff Accountant Salary in the US"
// (SEO audit 2026-10-12, section 5). Only for titles in getTitleSalaries: 5+ full-time listings that
// state pay, from 3+ different companies; otherwise 404, never linked, not in the sitemap. The page
// shows the listings behind the figures, so every number can be checked.
// SEO rule 7: rendered on its first visit, then cached and refreshed at most every 15 minutes
// (nothing at build time). Changing a job in /admin refreshes these pages at once (lib/page-cache.ts).
export const revalidate = 900;
export async function generateStaticParams(): Promise<{ title: string }[]> {
	return [];
}

const MIN_PER_LEVEL = 3; // a level's row in the table needs 3+ listings that state pay
const LISTINGS_SHOWN = 50;

type Props = { params: Promise<{ title: string }> };

const loadTitleSalary = cache(async (titleSlug: string) => {
	if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(titleSlug)) notFound();
	const titles = await getTitleSalaries(MIN_PAY_LISTINGS);
	const row = titles.find((t) => t.key === titleSlug);
	if (!row) notFound();
	const filter = { titleSlug };
	const [pay, levels, listings, roles, min] = await Promise.all([
		getPayStats(filter),
		getPayByGroup("level", filter, MIN_PER_LEVEL),
		getPayListings(filter, LISTINGS_SHOWN),
		getPayByGroup("category", {}, MIN_PAY_LISTINGS),
		minJobsPerPage(),
	]);
	if (!pay || pay.withPay < MIN_PAY_LISTINGS) notFound();
	return {
		name: row.label, // "Staff Accountant"
		pay,
		levels: LEVELS.flatMap((l) => levels.filter((r) => r.key === l).map((r) => ({ ...r, label: levelLabel(l, true) }))),
		listings,
		// Exact only when every listing is shown (always today: at most 16); otherwise left out.
		companies: listings.length === pay.withPay ? new Set(listings.map((j) => j.company_slug)).size : null,
		others: titles.filter((t) => t.key !== titleSlug),
		roles,
		jobsPage: pay.total >= min ? `/titles/${titleSlug}` : null, // the title's job list exists
	};
});

function seoTitle(name: string, median: number): string {
	return `${name} Salary in the US: Median ${shortUsd(median)}`;
}

function seoDescription(name: string, d: { pay: { withPay: number; low: number; median: number; high: number } }): string {
	return (
		`${name} pay in the US from ${d.pay.withPay} full-time job listings that state pay: low ${shortUsd(d.pay.low)}, ` +
		`median ${shortUsd(d.pay.median)}, high ${shortUsd(d.pay.high)}. Stated by employers, never estimated.`
	);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const slug = (await params).title;
	const d = await loadTitleSalary(slug);
	const title = seoTitle(d.name, d.pay.median);
	const description = seoDescription(d.name, d);
	return {
		title,
		description,
		alternates: { canonical: canonicalUrl(`/salaries/titles/${slug}`) },
		...socialMetadata(title, description, `/salaries/titles/${slug}`),
	};
}

export default async function TitleSalaryPage({ params }: Props) {
	const slug = (await params).title;
	const d = await loadTitleSalary(slug);
	const path = `/salaries/titles/${slug}`;

	return (
		<>
			<section className="border-b border-border bg-surface">
				<div className="mx-auto flex max-w-[1200px] flex-col gap-3.5 px-6 pb-[30px] pt-[22px]">
					<Breadcrumbs items={[{ label: "Salaries", href: "/salaries" }, { label: d.name }]} path={path} />
					<h1 className="text-[30px] font-bold leading-[1.15] tracking-[-0.02em] sm:text-[38px]">{d.name} Salary in the US</h1>
					<p className="max-w-[720px] text-[17px] leading-normal text-text-2">
						Yearly pay for {d.name} jobs at US companies, from the {d.pay.withPay} open full-time listings
						{d.companies ? ` at ${d.companies} companies` : ""} where the employer states pay. Never estimated.
					</p>
					<PayStrip
						stats={d.pay}
						salaryHref={d.jobsPage ?? "/salaries"}
						salaryLabel={d.jobsPage ? `${d.name} jobs` : "Finance salaries"}
					/>
				</div>
			</section>

			<main className="mx-auto flex max-w-[1200px] flex-wrap items-start gap-8 px-6 pb-16 pt-8">
				<div className="flex min-w-0 flex-[999_1_560px] flex-col gap-8">
					{d.levels.length >= 2 && (
						<section aria-labelledby="by-level" className="flex flex-col gap-3.5">
							<h2 id="by-level" className="text-[22px] font-bold tracking-[-0.01em]">
								{d.name} pay by experience level
							</h2>
							<PayTable caption={`Yearly ${d.name} pay by experience level`} firstColumn="Level" rows={d.levels} />
						</section>
					)}

					<section aria-labelledby="listings" className="flex flex-col gap-3.5">
						<h2 id="listings" className="text-[22px] font-bold tracking-[-0.01em]">
							{d.listings.length === d.pay.withPay
								? `The ${d.pay.withPay} listings behind these figures`
								: `The newest ${d.listings.length} of the ${d.pay.withPay} listings behind these figures`}
						</h2>
						<p className="text-[15px] leading-normal text-text-2">
							Open {d.name} jobs where the employer states pay, newest first. Pay is shown the way each employer states it.
						</p>
						{d.listings.map((job) => (
							<JobCard key={job.id} job={job} variant="full" />
						))}
					</section>
				</div>

				<aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-5">
					<PayMethod />
					<PlaceLinks
						id="other-titles"
						title="Salaries for other job titles"
						links={d.others.map((t) => ({ href: `/salaries/titles/${t.key}`, label: t.label }))}
						variant="pills"
						more={{ href: "/salaries", label: "All finance salaries" }}
					/>
					<PlaceLinks
						id="by-role"
						title="Finance salaries by role"
						links={d.roles.map((r) => ({ href: `/salaries/${r.key}`, label: categoryInfo(r.key)!.shortLabel }))}
						variant="pills"
					/>
				</aside>
			</main>
		</>
	);
}
