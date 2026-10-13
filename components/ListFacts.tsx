import Link from "next/link";
import SidebarBox from "@/components/SidebarBox";
import type { ListFacts as Facts } from "@/lib/db";
import { LEVELS, levelLabel } from "@/lib/format";

// "At a glance" box at the top of a list page's sidebar (SEO audit 2026-10-12, section 2): true,
// page-specific numbers from the open jobs on the page. A row is left out when it says nothing
// (e.g. the level split on a level page, top companies on a company page, zero new jobs).
export default function ListFacts({
	facts,
	show,
}: {
	facts: Facts;
	show: { levels: boolean; remote: boolean; companies: boolean };
}) {
	const levels = LEVELS.filter((l) => facts.levels[l]).map((l) => `${levelLabel(l)} ${facts.levels[l]}`);
	const pct = (n: number) => Math.round((n / facts.total) * 100);
	const rows: { term: string; detail: React.ReactNode }[] = [];
	if (show.levels && levels.length > 1) rows.push({ term: "By level", detail: levels.join(" · ") });
	if (show.remote && facts.remote > 0) {
		rows.push({ term: "Fully remote", detail: `${facts.remote} of ${facts.total} (${pct(facts.remote)}%)` });
	}
	if (facts.newThisWeek > 0) {
		rows.push({ term: "Posted in the last 7 days", detail: `${facts.newThisWeek} of ${facts.total}` });
	}
	if (show.companies && facts.topCompanies.length > 0) {
		rows.push({
			term: "Top hiring companies",
			detail: (
				<ul className="flex flex-col gap-1">
					{facts.topCompanies.map((c) => (
						<li key={c.key} className="flex justify-between gap-3">
							<Link href={`/companies/${c.key}`}>{c.label}</Link>
							<span className="font-mono text-muted">{c.count}</span>
						</li>
					))}
				</ul>
			),
		});
	}
	if (rows.length === 0) return null;
	return (
		<SidebarBox id="glance" title="At a glance">
			<dl className="flex flex-col gap-3 text-sm">
				{rows.map((r) => (
					<div key={r.term} className="flex flex-col gap-1">
						<dt className="text-muted">{r.term}</dt>
						<dd className="text-text-2">{r.detail}</dd>
					</div>
				))}
			</dl>
		</SidebarBox>
	);
}
