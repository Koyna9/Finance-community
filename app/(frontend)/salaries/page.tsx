import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import PayMethod from "@/components/PayMethod";
import PayStrip, { MIN_PAY_LISTINGS } from "@/components/PayStrip";
import PayTable from "@/components/PayTable";
import { getPayByGroup, getPayStats } from "@/lib/db";
import { CATEGORY_LIST, categoryInfo } from "@/lib/format";
import { canonicalUrl, salaryDescription } from "@/lib/seo";

// Pay overview: each category's low, median and high yearly USD, and how many jobs state pay
// (CLAUDE.md section 9). Only employer-stated pay; a figure needs 5+ listings that state pay.
export const dynamic = "force-dynamic";

const PATH = "/salaries";

export async function generateMetadata(): Promise<Metadata> {
	const pay = await getPayStats({});
	return {
		title: "Finance Salaries in the US by Role",
		description:
			pay && pay.withPay >= MIN_PAY_LISTINGS
				? salaryDescription("finance", pay, " By role: accounting, FP&A, tax, audit and more.")
				: "Yearly pay for US finance jobs by role, from listings where the employer states pay.",
		alternates: { canonical: canonicalUrl(PATH) },
	};
}

export default async function SalariesPage() {
	const [pay, byCategory] = await Promise.all([getPayStats({}), getPayByGroup("category", {}, 1)]);
	const enough = byCategory.filter((r) => r.withPay >= MIN_PAY_LISTINGS);
	const enoughKeys = new Set(enough.map((r) => r.key));

	return (
		<>
			<section className="border-b border-border bg-surface">
				<div className="mx-auto flex max-w-[1200px] flex-col gap-3.5 px-6 pb-[30px] pt-[22px]">
					<Breadcrumbs items={[{ label: "Salaries" }]} path={PATH} />
					<h1 className="text-[30px] font-bold leading-[1.15] tracking-[-0.02em] sm:text-[38px]">
						Finance Salaries in the US
					</h1>
					<p className="max-w-[720px] text-[17px] leading-normal text-text-2">
						Yearly pay for finance roles at US companies, built only from open listings where the employer states
						pay. No estimates.
					</p>
					{pay && pay.withPay >= MIN_PAY_LISTINGS && (
						<PayStrip stats={pay} salaryHref="/finance-jobs" salaryLabel="All finance jobs" />
					)}
				</div>
			</section>

			<main className="mx-auto flex max-w-[1200px] flex-wrap items-start gap-8 px-6 pb-16 pt-8">
				<section aria-labelledby="by-role" className="flex min-w-0 flex-[999_1_560px] flex-col gap-3.5">
					<h2 id="by-role" className="text-[22px] font-bold tracking-[-0.01em]">
						Pay by role
					</h2>
					<PayTable
						caption="Yearly pay by finance role"
						firstColumn="Role"
						rows={enough.map((r) => ({
							...r,
							label: categoryInfo(r.key)!.label,
							href: `/salaries/${r.key}`,
						}))}
						tooFew={CATEGORY_LIST.filter((c) => !enoughKeys.has(c.key)).map((c) => ({
							key: c.key,
							label: c.label,
							withPay: byCategory.find((r) => r.key === c.key)?.withPay ?? 0,
						}))}
					/>
				</section>

				<aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-5">
					<PayMethod />
				</aside>
			</main>
		</>
	);
}
