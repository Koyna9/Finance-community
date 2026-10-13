import Link from "next/link";
import { shortUsd } from "@/lib/format";

export type PayTableRow = {
	key: string;
	label: string;
	href?: string; // link on the row's name (only to pages that exist)
	low: number;
	median: number;
	high: number;
	withPay: number;
	total: number;
};

// Low / Median / High table (salary pages). Scrolls sideways inside its card on narrow phones,
// never the whole page. `tooFew` rows have too few listings stating pay: shown, but without figures.
export default function PayTable({
	caption,
	firstColumn,
	rows,
	tooFew = [],
}: {
	caption: string;
	firstColumn: string;
	rows: PayTableRow[];
	tooFew?: { key: string; label: string; href?: string; withPay: number }[];
}) {
	const th = "px-4 py-3 text-left text-[13px] font-semibold text-muted";
	const num = "px-4 py-3 text-right font-mono text-[15px] font-semibold whitespace-nowrap";
	const name = (r: { label: string; href?: string }) =>
		r.href ? (
			<Link href={r.href} className="font-semibold">
				{r.label}
			</Link>
		) : (
			<span className="font-semibold">{r.label}</span>
		);
	return (
		<div className="overflow-x-auto rounded-[10px] border border-border bg-surface">
			<table className="w-full min-w-[560px] border-collapse text-[15px]">
				<caption className="sr-only">{caption}</caption>
				<thead className="border-b border-border bg-surface-2">
					<tr>
						<th scope="col" className={th}>
							{firstColumn}
						</th>
						<th scope="col" className={`${th} text-right`}>
							Low
						</th>
						<th scope="col" className={`${th} bg-accent-tint text-right text-accent-tint-text`}>
							Median
						</th>
						<th scope="col" className={`${th} text-right`}>
							High
						</th>
						<th scope="col" className={`${th} text-right`}>
							Full-time with pay
						</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((r) => (
						<tr key={r.key} className="border-t border-border-soft first:border-t-0">
							<th scope="row" className="px-4 py-3 text-left font-normal">
								{name(r)}
							</th>
							<td className={num}>{shortUsd(r.low)}</td>
							<td className={`${num} bg-accent-tint/60 text-accent-text`}>{shortUsd(r.median)}</td>
							<td className={num}>{shortUsd(r.high)}</td>
							<td className="px-4 py-3 text-right font-mono text-sm text-muted">
								{r.withPay} of {r.total}
							</td>
						</tr>
					))}
					{tooFew.map((r) => (
						<tr key={r.key} className="border-t border-border-soft">
							<th scope="row" className="px-4 py-3 text-left font-normal">
								{name(r)}
							</th>
							<td colSpan={4} className="px-4 py-3 text-right text-sm text-muted">
								Too few full-time listings state pay yet ({r.withPay})
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
