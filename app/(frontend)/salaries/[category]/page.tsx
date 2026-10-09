import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import Breadcrumbs from "@/components/Breadcrumbs";
import PayMethod from "@/components/PayMethod";
import PayStrip, { MIN_PAY_LISTINGS } from "@/components/PayStrip";
import PayTable from "@/components/PayTable";
import PlaceLinks from "@/components/PlaceLinks";
import { getPayByGroup, getPayStats, minJobsPerPage } from "@/lib/db";
import { CATEGORY_LIST, categoryInfo } from "@/lib/format";
import { canonicalUrl, salaryDescription, salaryTitle } from "@/lib/seo";

// Pay for one category: the US figure + a table by state, only states where 5+ jobs state pay
// (CLAUDE.md section 9). The page exists only when 5+ US jobs in the category state pay.
// SEO rule 7: rendered on its first visit, then cached and refreshed at most every 15 minutes
// (nothing at build time). Changing a job in /admin refreshes these pages at once (collections/Jobs.ts).
export const revalidate = 900;
export async function generateStaticParams(): Promise<{ category: string }[]> {
	return [];
}

type Props = { params: Promise<{ category: string }> };

const loadSalary = cache(async (key: string) => {
	const cat = CATEGORY_LIST.find((c) => c.key === key);
	if (!cat) notFound();
	const pay = await getPayStats({ category: cat.key });
	if (!pay || pay.withPay < MIN_PAY_LISTINGS) notFound();
	const [states, others, min] = await Promise.all([
		getPayByGroup("state", { category: cat.key }, MIN_PAY_LISTINGS),
		getPayByGroup("category", {}, MIN_PAY_LISTINGS),
		minJobsPerPage(),
	]);
	return { cat, pay, states, others: others.filter((o) => o.key !== cat.key), min };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { cat, pay } = await loadSalary((await params).category);
	return {
		title: salaryTitle(cat.label, pay),
		description: salaryDescription(cat.label, pay, " With pay by state."),
		alternates: { canonical: canonicalUrl(`/salaries/${cat.key}`) },
	};
}

export default async function CategorySalaryPage({ params }: Props) {
	const { cat, pay, states, others, min } = await loadSalary((await params).category);
	const path = `/salaries/${cat.key}`;

	return (
		<>
			<section className="border-b border-border bg-surface">
				<div className="mx-auto flex max-w-[1200px] flex-col gap-3.5 px-6 pb-[30px] pt-[22px]">
					<Breadcrumbs items={[{ label: "Salaries", href: "/salaries" }, { label: cat.shortLabel }]} path={path} />
					<h1 className="text-[30px] font-bold leading-[1.15] tracking-[-0.02em] sm:text-[38px]">
						{cat.label} Salaries in the US
					</h1>
					<p className="max-w-[720px] text-[17px] leading-normal text-text-2">
						Yearly pay for {cat.label} jobs at US companies, from the {pay.withPay} open listings where the employer
						states pay.
					</p>
					<PayStrip stats={pay} salaryHref={cat.path} salaryLabel={`${cat.shortLabel} jobs`} />
				</div>
			</section>

			<main className="mx-auto flex max-w-[1200px] flex-wrap items-start gap-8 px-6 pb-16 pt-8">
				<section aria-labelledby="by-state" className="flex min-w-0 flex-[999_1_560px] flex-col gap-3.5">
					<h2 id="by-state" className="text-[22px] font-bold tracking-[-0.01em]">
						{cat.shortLabel} pay by state
					</h2>
					{states.length === 0 ? (
						<p className="rounded-[10px] border border-border bg-surface p-5 text-text-2">
							No state has {MIN_PAY_LISTINGS} or more {cat.shortLabel} listings that state pay yet.
						</p>
					) : (
						<PayTable
							caption={`Yearly ${cat.label} pay by state`}
							firstColumn="State"
							rows={states.map((s) => ({
								...s,
								href: s.total >= min ? `${cat.path}/${s.key}` : undefined,
							}))}
						/>
					)}
				</section>

				<aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-5">
					<PayMethod />
					<PlaceLinks
						id="other-pay"
						title="Other finance salaries"
						links={others.map((o) => ({ href: `/salaries/${o.key}`, label: categoryInfo(o.key)!.shortLabel }))}
						variant="pills"
						more={{ href: "/salaries", label: "All finance salaries" }}
					/>
				</aside>
			</main>
		</>
	);
}
