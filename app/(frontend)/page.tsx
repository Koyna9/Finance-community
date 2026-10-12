import type { Metadata } from "next";
import Link from "next/link";
import JobCard from "@/components/JobCard";
import SidebarBox, { LinkList } from "@/components/SidebarBox";
import {
	getCategoryCounts,
	getGroupCounts,
	getLatestJobs,
	getLevelCounts,
	getSiteStats,
	getSiteText,
	getTopStates,
	minJobsPerPage,
} from "@/lib/db";
import { CATEGORY_LIST, LEVELS, levelLabel, levelPath } from "@/lib/format";
import { canonicalUrl, homeDescription, homeTitle } from "@/lib/seo";

export const dynamic = "force-dynamic";

const LATEST_JOBS = 20;
const SIDEBAR_STATES = 9;

const QUICK_LINKS = [
	{ href: "/accounting-jobs", label: "Accounting" },
	{ href: "/fpa-jobs", label: "FP&A" },
	{ href: "/tax-jobs", label: "Tax" },
	{ href: "/finance-jobs/remote", label: "Remote finance jobs" },
	{ href: "/entry-level-finance-jobs", label: "Entry level" },
];

// Headline, subline and meta description can be edited in /admin (Site Text); empty = the text below.
export async function generateMetadata(): Promise<Metadata> {
	const [stats, siteText] = await Promise.all([getSiteStats(), getSiteText()]);
	return {
		title: { absolute: homeTitle() },
		description: siteText.defaultSeoDescription ?? homeDescription(stats.open),
		alternates: { canonical: canonicalUrl("/") },
	};
}

// Simple line icons (24×24, stroke = currentColor), decorative only.
function Icon({ paths }: { paths: React.ReactNode }) {
	return (
		<svg
			width="22"
			height="22"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			{paths}
		</svg>
	);
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
	accounting: (
		<>
			<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z" />
			<path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3" />
			<path d="M9 7.5h6M9 11h6" />
		</>
	),
	fpa: (
		<>
			<path d="M4 4v16h16" />
			<path d="m7.5 15 3.5-4 3 2.5 5-6" />
		</>
	),
	tax: (
		<>
			<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
			<path d="m9 14 6-6" />
			<circle cx="9.5" cy="8.5" r="1" />
			<circle cx="14.5" cy="13.5" r="1" />
		</>
	),
	audit: (
		<>
			<circle cx="11" cy="11" r="7" />
			<path d="m20.5 20.5-4.5-4.5" />
			<path d="m8.5 11 2 2 3.5-4" />
		</>
	),
	"risk-compliance": (
		<>
			<path d="M12 3 5 6v5c0 4.5 3 8.5 7 10 4-1.5 7-5.5 7-10V6z" />
			<path d="m9 12 2 2 4-4" />
		</>
	),
	investment: (
		<>
			<path d="m3 17 6-6 4 4 8-8" />
			<path d="M15 7h6v6" />
		</>
	),
	treasury: (
		<>
			<path d="M3 9.5 12 4l9 5.5" />
			<path d="M5.5 10v8M10 10v8M14 10v8M18.5 10v8" />
			<path d="M3 20h18" />
		</>
	),
	leadership: (
		<>
			<rect x="3" y="7" width="18" height="13" rx="2" />
			<path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
			<path d="M3 13h18" />
		</>
	),
};

// What makes the site different (all true for every listing).
const PROMISES = [
	{
		title: "Straight from employers",
		text: "Every job comes from a company's own careers site, not a staffing agency. You apply with them directly.",
		icon: (
			<>
				<path d="M4 20V9l8-5 8 5v11" />
				<path d="M9 20v-6h6v6" />
			</>
		),
	},
	{
		title: "Sorted for finance",
		text: "Browse by role, experience level, state and city. Every combination has its own page.",
		icon: (
			<>
				<path d="M4 6h16M7 12h10M10 18h4" />
			</>
		),
	},
	{
		title: "Pay only when it's real",
		text: "We show pay only when the employer states it. No estimates, no guesses.",
		icon: (
			<>
				<path d="M12 3v18" />
				<path d="M16.5 7.5c0-1.7-2-3-4.5-3s-4.5 1.3-4.5 3 2 2.6 4.5 3 4.5 1.3 4.5 3-2 3-4.5 3-4.5-1.3-4.5-3" />
			</>
		),
	},
];

function Stat({ value, label }: { value: number; label: string }) {
	return (
		<div className="flex flex-col gap-0.5">
			<span className="font-mono text-[30px] font-semibold">{value}</span>
			<span className="text-sm text-hero-label">{label}</span>
		</div>
	);
}

// Arrow that slides right when its parent link (.group) is hovered.
function Arrow() {
	return (
		<span
			aria-hidden="true"
			className="inline-block transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none"
		>
			→
		</span>
	);
}

export default async function Home() {
	const [stats, categoryCounts, levelCounts, states, jobs, min, titles, companies, siteText] = await Promise.all([
		getSiteStats(),
		getCategoryCounts(),
		getLevelCounts(),
		getTopStates(SIDEBAR_STATES),
		getLatestJobs(LATEST_JOBS),
		minJobsPerPage(),
		getGroupCounts("title"), // titles with pages (MIN_JOBS_PER_PAGE+ jobs), as /titles lists them
		getGroupCounts("company", {}, 1),
		getSiteText(),
	]);
	// Biggest roles first.
	const roles = [...CATEGORY_LIST].sort((a, b) => (categoryCounts[b.key] ?? 0) - (categoryCounts[a.key] ?? 0));

	return (
		<>
			{/* 1. Navy hero */}
			<section className="relative overflow-hidden bg-ink text-white">
				{/* Decorative: the logo mark's three bars, large, on wide screens */}
				<div
					aria-hidden="true"
					className="pointer-events-none absolute bottom-0 right-[max(24px,calc((100vw-1200px)/2+24px))] hidden items-end gap-5 lg:flex"
				>
					<span className="h-[120px] w-[34px] rounded-t-md bg-white/[0.07]" />
					<span className="h-[190px] w-[34px] rounded-t-md bg-white/[0.11]" />
					<span className="h-[270px] w-[34px] rounded-t-md bg-accent/70" />
				</div>

				<div className="relative mx-auto flex max-w-[1200px] flex-col gap-[22px] px-6 pb-14 pt-12 sm:pt-16">
					<p className="flex items-center gap-2 font-mono text-[13px] uppercase tracking-[0.08em] text-hero-eyebrow">
						<span aria-hidden="true" className="h-2 w-2 rounded-full bg-accent" />
						US finance jobs · updated every night
					</p>
					<h1 className="max-w-[760px] text-[34px] font-bold leading-[1.12] tracking-[-0.02em] sm:text-[46px]">
						{siteText.homeHeadline ?? "Finance roles at US companies, straight from their hiring pages."}
					</h1>
					<p className="max-w-[640px] text-lg leading-[1.55] text-hero-body">
						{siteText.homeSubline ?? (
							<>
								Accounting, FP&amp;A, tax, audit and more, sorted by role, level, state and city. Every listing links to
								the employer&apos;s own site to apply.
							</>
						)}
					</p>
					<div className="mt-1.5 flex flex-wrap gap-3">
						{QUICK_LINKS.map((q) => (
							<Link
								key={q.href}
								href={q.href}
								className="relative rounded-full border border-white/20 bg-white/10 px-4 py-[11px] text-[15px] font-medium text-white transition-colors duration-150 after:absolute after:inset-x-4 after:bottom-1.5 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-accent after:transition-transform after:duration-200 hover:border-chip hover:bg-chip hover:text-ink hover:no-underline hover:after:scale-x-100 motion-reduce:after:transition-none focus-visible:outline-white"
							>
								{q.label}
							</Link>
						))}
					</div>
					<div className="mt-[18px] flex max-w-[760px] flex-wrap gap-x-10 gap-y-5 border-t border-white/15 pt-6">
						<Stat value={stats.open} label="open finance jobs" />
						<Stat value={stats.statesWithPages} label={`states with ${min}+ roles`} />
						<Stat value={stats.withPay} label="listings state pay" />
					</div>
				</div>
			</section>

			{/* 2. What makes the site different */}
			<section aria-label="Why use this site" className="border-b border-border bg-surface">
				<ul className="mx-auto grid max-w-[1200px] grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-x-8 gap-y-5 px-6 py-7">
					{PROMISES.map((p) => (
						<li key={p.title} className="flex items-start gap-3.5">
							<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[9px] bg-accent-tint text-accent-text">
								<Icon paths={p.icon} />
							</span>
							<span className="flex flex-col gap-1">
								<span className="text-[15px] font-semibold">{p.title}</span>
								<span className="text-sm leading-normal text-muted">{p.text}</span>
							</span>
						</li>
					))}
				</ul>
			</section>

			<main className="mx-auto flex max-w-[1200px] flex-col gap-14 px-6 pb-16 pt-12">
				{/* 3. Browse by role */}
				<section aria-labelledby="roles" className="flex flex-col gap-[18px]">
					<div className="flex flex-wrap items-baseline justify-between gap-3">
						<h2 id="roles" className="text-[26px] font-bold tracking-[-0.01em]">
							Browse by role
						</h2>
						<Link href="/finance-jobs" className="group text-[15px] font-semibold text-accent-text">
							All finance jobs <Arrow />
						</Link>
					</div>
					<div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3.5">
						{roles.map((r) => (
							<Link
								key={r.key}
								href={r.path}
								className="group flex min-h-[92px] flex-col gap-3 rounded-[10px] border border-border bg-surface px-5 py-[18px] text-text transition-[border-color,transform] duration-200 hover:border-accent hover:text-text hover:no-underline motion-safe:hover:-translate-y-0.5"
							>
								<span className="flex items-start justify-between gap-3">
									<span className="flex h-10 w-10 items-center justify-center rounded-[9px] bg-accent-tint text-accent-text transition-colors duration-200 group-hover:bg-ink group-hover:text-white">
										<Icon paths={CATEGORY_ICONS[r.key]} />
									</span>
									<span className="font-mono text-[13px] font-semibold text-muted">
										{categoryCounts[r.key] ?? 0} open
									</span>
								</span>
								<span className="flex flex-col gap-1">
									<span className="text-[17px] font-semibold transition-colors duration-200 group-hover:text-accent-text">
										{r.shortLabel}
									</span>
									<span className="text-sm text-muted">{r.hint}</span>
								</span>
								<span className="mt-auto text-sm font-semibold text-accent-text">
									View jobs <Arrow />
								</span>
							</Link>
						))}
					</div>
				</section>

				{/* 4. Latest jobs + sidebar */}
				<section aria-labelledby="latest" className="flex flex-wrap items-start gap-8">
					<div className="flex min-w-0 flex-[999_1_560px] flex-col gap-3.5">
						<div className="flex flex-wrap items-baseline justify-between gap-3">
							<h2 id="latest" className="text-[26px] font-bold tracking-[-0.01em]">
								Latest jobs
							</h2>
							<span className="text-sm text-muted">Newest first · checked nightly</span>
						</div>
						{jobs.length === 0 ? (
							<p className="rounded-[10px] border border-border bg-surface p-5 text-text-2">No open jobs here yet.</p>
						) : (
							jobs.map((job) => <JobCard key={job.id} job={job} variant="compact" />)
						)}
						<Link
							href="/finance-jobs"
							className="group mt-1 self-start rounded-lg bg-ink px-[18px] py-3 text-[15px] font-semibold text-white transition-colors duration-150 hover:bg-ink/90 hover:text-white hover:no-underline"
						>
							See all {stats.open} finance jobs <Arrow />
						</Link>
					</div>

					<aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-5">
						{states.length > 0 && (
							<SidebarBox id="states" title="Browse by state">
								<LinkList
									links={states.map((s) => ({ href: `/finance-jobs/${s.key}`, label: s.label, count: s.count }))}
								/>
								<Link href="/locations" className="group mt-3 inline-block text-sm font-semibold text-accent-text">
									All locations <Arrow />
								</Link>
							</SidebarBox>
						)}
						<SidebarBox id="levels" title="By experience level">
							<div className="grid grid-cols-2 gap-2.5">
								{LEVELS.map((l) => (
									<Link
										key={l}
										href={levelPath(l)}
										className="flex flex-col gap-0.5 rounded-lg border border-border p-3 text-text transition-colors duration-150 hover:border-accent hover:bg-accent-tint hover:text-text hover:no-underline"
									>
										<span className="text-[15px] font-semibold">{levelLabel(l, true)}</span>
										<span className="font-mono text-[13px] text-muted">{levelCounts[l] ?? 0} jobs</span>
									</Link>
								))}
							</div>
						</SidebarBox>
						<SidebarBox id="more-ways" title="More ways to browse">
							<LinkList
								links={[
									{ href: "/titles", label: "Job titles A–Z", count: titles.length },
									{ href: "/companies", label: "Companies hiring", count: companies.length },
								]}
							/>
						</SidebarBox>
						<section aria-labelledby="pay" className="group/pay flex flex-col gap-2 rounded-[10px] bg-accent-tint p-5">
							{/* The coin sits next to the heading, not inside it, so the heading text stays "What finance roles pay" */}
							<div className="flex items-center gap-2">
								<h2 id="pay" className="text-lg font-bold">
									What finance roles pay
								</h2>
								{/* "$" coin: pops in while the box is hovered (or its link focused) and keeps turning left to right */}
								<span
									aria-hidden="true"
									className="inline-flex scale-50 opacity-0 transition-[opacity,transform] duration-200 group-focus-within/pay:scale-100 group-focus-within/pay:opacity-100 group-hover/pay:scale-100 group-hover/pay:opacity-100"
								>
									<span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent-text font-mono text-[15px] font-bold text-white group-hover/pay:animate-coin-flip motion-reduce:group-hover/pay:animate-none">
										$
									</span>
								</span>
							</div>
							<p className="text-[15px] leading-normal text-accent-tint-text">
								Pay ranges by role and state, built only from listings where the employer states pay.
							</p>
							<Link href="/salaries" className="group text-[15px] font-semibold text-accent-text">
								See salaries <Arrow />
							</Link>
						</section>
					</aside>
				</section>
			</main>
		</>
	);
}
