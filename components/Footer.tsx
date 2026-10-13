import Link from "next/link";
import { getTopStates } from "@/lib/db";
import { CATEGORY_LIST } from "@/lib/format";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

const TOP_STATES = 15;

function Column({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div className="flex min-w-[140px] flex-col gap-2">
			<span className="font-semibold">{title}</span>
			{children}
		</div>
	);
}

// White footer: name + one-line description, then Roles / Top states / Explore / About link columns.
export default async function Footer() {
	const states = await getTopStates(TOP_STATES);
	return (
		<footer className="border-t border-border bg-surface">
			<div className="mx-auto flex max-w-[1200px] flex-wrap justify-between gap-10 px-6 py-9">
				<div className="flex max-w-[320px] flex-col gap-2">
					<span className="text-lg font-bold text-ink">{SITE_NAME}</span>
					<span className="text-sm leading-normal text-muted">{SITE_DESCRIPTION}</span>
				</div>
				<div className="flex flex-wrap gap-x-12 gap-y-8 text-sm">
					<Column title="Roles">
						{CATEGORY_LIST.map((c) => (
							<Link key={c.key} href={c.path}>
								{c.label}
							</Link>
						))}
					</Column>
					{states.length > 0 && (
						<Column title="Top states">
							{states.map((s) => (
								<Link key={s.key} href={`/finance-jobs/${s.key}`}>
									{s.label}
								</Link>
							))}
						</Column>
					)}
					<Column title="Explore">
						<Link href="/locations">Locations</Link>
						<Link href="/titles">Job titles</Link>
						<Link href="/companies">Companies</Link>
						<Link href="/salaries">Salaries</Link>
						<Link href="/finance-jobs/remote">Remote jobs</Link>
					</Column>
					<Column title="About">
						<Link href="/about">About us</Link>
						<Link href="/how-we-source-jobs">How we source jobs</Link>
					</Column>
				</div>
			</div>
		</footer>
	);
}
