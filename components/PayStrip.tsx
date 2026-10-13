import Link from "next/link";
import type { PayStats } from "@/lib/db";
import { shortUsd } from "@/lib/format";

export const MIN_PAY_LISTINGS = 5; // only shown when 5+ jobs on the page state pay

// Low · Median · High row under a list page's H1 (DESIGN.md section 4).
export default function PayStrip({
	stats,
	salaryHref,
	salaryLabel,
}: {
	stats: PayStats;
	salaryHref: string;
	salaryLabel: string;
}) {
	const cell = "flex flex-[1_1_160px] flex-col gap-0.5 border-b border-border px-[18px] py-3.5 sm:border-b-0 sm:border-r";
	return (
		<div className="mt-1.5 flex flex-wrap overflow-hidden rounded-[10px] border border-border bg-surface-2">
			<div className={cell}>
				<span className="text-[13px] text-muted">Low</span>
				<span className="font-mono text-[22px] font-semibold">{shortUsd(stats.low)}</span>
			</div>
			<div className={`${cell} bg-accent-tint`}>
				<span className="text-[13px] text-accent-tint-text">Median pay</span>
				<span className="font-mono text-[22px] font-semibold text-accent-text">{shortUsd(stats.median)}</span>
			</div>
			<div className={cell}>
				<span className="text-[13px] text-muted">High</span>
				<span className="font-mono text-[22px] font-semibold">{shortUsd(stats.high)}</span>
			</div>
			<p className="flex-[2_1_240px] self-center px-[18px] py-3.5 text-sm leading-[1.45] text-muted">
				Yearly, from the {stats.withPay} of {stats.total} listings that state full-time pay.{" "}
				<Link href={salaryHref} className="font-semibold text-accent-text">
					{salaryLabel} →
				</Link>
			</p>
		</div>
	);
}
