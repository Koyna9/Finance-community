import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import ListFilter from "@/components/ListFilter";
import { countJobs, getLocations } from "@/lib/db";
import { canonicalUrl } from "@/lib/seo";
import { stateCode } from "@/shared/states.js";

// Every state with its open-job count, and its cities with counts (CLAUDE.md section 9).
// Only states and cities whose page passes the thin-page rule are listed (never link to a 404).
export const dynamic = "force-dynamic";

const PATH = "/locations";
const TOP_STATES = 6;

// A function (not a constant), so SITE_URL is read per request, never at build time.
export async function generateMetadata(): Promise<Metadata> {
	return {
		title: "Finance Jobs by US State and City",
		description:
			"Browse open finance jobs in every US state and city we cover: accounting, FP&A, tax, audit and more, plus remote roles.",
		alternates: { canonical: canonicalUrl(PATH) },
	};
}

type State = Awaited<ReturnType<typeof getLocations>>[number];

function Stat({ value, label }: { value: number; label: string }) {
	return (
		<div className="flex flex-col gap-0.5">
			<span className="font-mono text-[30px] font-semibold">{value}</span>
			<span className="text-sm text-hero-label">{label}</span>
		</div>
	);
}

// 2-letter state code on a tile, like the company tiles on job cards.
// hover: turns navy with white letters while its card (.group) is hovered, like the home role cards.
function StateTile({ name, size, hover = false }: { name: string; size: number; hover?: boolean }) {
	return (
		<span
			aria-hidden="true"
			style={{ width: size, height: size, flexBasis: size }}
			className={`flex shrink-0 items-center justify-center rounded-[9px] bg-logo-tile font-mono text-[15px] font-semibold text-ink ${
				hover ? "transition-colors duration-200 group-hover:bg-ink group-hover:text-white" : ""
			}`}
		>
			{stateCode(name) ?? name.slice(0, 2).toUpperCase()}
		</span>
	);
}

function jobsText(n: number): string {
	return `${n} ${n === 1 ? "job" : "jobs"}`;
}

export default async function LocationsPage() {
	const [states, remoteCount] = await Promise.all([getLocations(), countJobs({ remote: true })]);
	const jobsInStates = states.reduce((sum, s) => sum + s.count, 0);
	const cityCount = states.reduce((sum, s) => sum + s.cities.length, 0);
	const top = states.slice(0, TOP_STATES); // getLocations() is biggest first
	const maxCount = top[0]?.count ?? 1;

	// A–Z, grouped by first letter.
	const groups = new Map<string, State[]>();
	for (const s of [...states].sort((a, b) => a.label.localeCompare(b.label))) {
		const letter = s.label[0].toUpperCase();
		groups.set(letter, [...(groups.get(letter) ?? []), s]);
	}

	return (
		<>
			<div className="border-b border-border bg-surface">
				<div className="mx-auto max-w-[1200px] px-6 py-3.5">
					<Breadcrumbs items={[{ label: "Locations" }]} path={PATH} />
				</div>
			</div>

			{/* Navy hero (same style as the home page) */}
			<section className="bg-ink text-white">
				<div className="mx-auto flex max-w-[1200px] flex-col gap-[18px] px-6 pb-12 pt-10 sm:pt-12">
					<p className="font-mono text-[13px] uppercase tracking-[0.08em] text-hero-eyebrow">
						US finance jobs · by location
					</p>
					<h1 className="max-w-[760px] text-[32px] font-bold leading-[1.12] tracking-[-0.02em] sm:text-[42px]">
						Finance Jobs by US State and City
					</h1>
					<p className="max-w-[640px] text-lg leading-[1.55] text-hero-body">
						Pick a state or city to see its open accounting, FP&amp;A, tax, audit and other finance roles, straight
						from employers&apos; own hiring pages.
					</p>
					<div className="mt-3 flex flex-wrap gap-x-10 gap-y-5 border-t border-white/15 pt-6">
						<Stat value={jobsInStates} label="open jobs in states" />
						<Stat value={states.length} label={states.length === 1 ? "state" : "states"} />
						<Stat value={cityCount} label={cityCount === 1 ? "city" : "cities"} />
						<Stat value={remoteCount} label="remote jobs" />
					</div>
				</div>
			</section>

			<main id="locations-list" className="mx-auto flex max-w-[1200px] flex-col gap-12 px-6 pb-16 pt-10">
				{states.length === 0 && remoteCount === 0 ? (
					<p className="rounded-[10px] border border-border bg-surface p-5 text-text-2">No open jobs here yet.</p>
				) : (
					<>
						{states.length > 0 && (
							<ListFilter
								target="locations-list"
								label="Search states and cities"
								placeholder="Search a state or city, e.g. Texas or Austin"
								noun={["state", "states"]}
							/>
						)}

						{/* Biggest states + remote (hidden while searching) */}
						<section aria-labelledby="top" data-filter-hide className="-mt-6 flex flex-col gap-[18px]">
							<h2 id="top" className="text-[26px] font-bold tracking-[-0.01em]">
								Where the jobs are
							</h2>
							<div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3.5">
								{top.map((s) => (
									<Link
										key={s.key}
										href={`/finance-jobs/${s.key}`}
										className="group flex flex-col gap-3 rounded-[10px] border border-border bg-surface p-5 text-text transition-[border-color,transform] duration-200 hover:border-accent hover:text-text hover:no-underline motion-safe:hover:-translate-y-0.5"
									>
										<span className="flex items-center gap-3">
											<StateTile name={s.label} size={44} hover />
											<span className="flex min-w-0 flex-col">
												<span className="text-[17px] font-semibold transition-colors duration-200 group-hover:text-accent-text">
													{s.label}
												</span>
												<span className="font-mono text-sm font-semibold text-accent-text">{jobsText(s.count)}</span>
											</span>
										</span>
										{/* Share of the biggest state (decorative bar) */}
										<span aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-chip">
											<span
												className="block h-full rounded-full bg-accent"
												style={{ width: `${Math.max(6, Math.round((s.count / maxCount) * 100))}%` }}
											/>
										</span>
									</Link>
								))}
								{remoteCount > 0 && (
									<Link
										href="/finance-jobs/remote"
										className="group flex flex-col justify-between gap-3 rounded-[10px] border border-transparent bg-accent-tint p-5 text-accent-tint-text transition-[border-color,transform] duration-200 hover:border-accent hover:text-accent-tint-text hover:no-underline motion-safe:hover:-translate-y-0.5"
									>
										<span className="flex flex-col gap-1">
											<span className="text-[17px] font-semibold">Remote (US)</span>
											<span className="text-sm leading-normal">Fully remote finance roles open to US candidates.</span>
										</span>
										<span className="font-mono text-sm font-semibold text-accent-text">
											{jobsText(remoteCount)}{" "}
											<span
												aria-hidden="true"
												className="inline-block transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none"
											>
												→
											</span>
										</span>
									</Link>
								)}
							</div>
						</section>

						{/* All states A–Z */}
						{states.length > 0 && (
							<section aria-labelledby="all" className="flex flex-col gap-6">
								<div className="flex flex-col gap-3">
									<h2 id="all" className="text-[26px] font-bold tracking-[-0.01em]">
										All states A–Z
									</h2>
									<nav aria-label="Jump to letter" className="flex flex-wrap gap-2">
										{[...groups.keys()].map((letter) => (
											<a
												key={letter}
												href={`#letter-${letter}`}
												className="flex h-11 w-11 items-center justify-center rounded-lg border border-border-strong bg-surface font-mono text-[15px] font-semibold"
											>
												{letter}
											</a>
										))}
									</nav>
								</div>

								{[...groups.entries()].map(([letter, list]) => (
									<section
										key={letter}
										id={`letter-${letter}`}
										aria-label={`States starting with ${letter}`}
										data-filter-section
										className="flex scroll-mt-6 flex-col gap-3.5"
									>
										<div className="flex items-center gap-3">
											<span className="font-mono text-[22px] font-semibold text-accent-text">{letter}</span>
											<span className="h-px flex-1 bg-border" />
										</div>
										<ul className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] items-start gap-3.5">
											{list.map((s) => (
												<StateCard key={s.key} state={s} />
											))}
										</ul>
									</section>
								))}
							</section>
						)}
					</>
				)}
			</main>
		</>
	);
}

function StateCard({ state: s }: { state: State }) {
	return (
		<li data-filter-item data-filter-text={s.label} className="flex flex-col rounded-[10px] border border-border bg-surface p-5">
			<div className="flex items-center gap-3">
				<StateTile name={s.label} size={40} />
				<Link href={`/finance-jobs/${s.key}`} className="min-w-0 flex-1 text-[17px] font-semibold">
					{s.label}
				</Link>
				<span className="rounded-md bg-accent-tint px-[9px] py-[5px] font-mono text-[13px] font-semibold text-accent-text">
					{s.count}
				</span>
			</div>
			{s.cities.length > 0 && (
				<ul className="mt-3">
					{s.cities.map((c) => (
						<li key={c.key} data-filter-subitem data-filter-text={c.label} className="border-t border-border-soft">
							<Link href={`/finance-jobs/${s.key}/${c.key}`} className="flex justify-between gap-3 py-2 text-[15px]">
								<span>{c.label}</span>
								<span className="font-mono text-muted">{c.count}</span>
							</Link>
						</li>
					))}
				</ul>
			)}
			<Link href={`/finance-jobs/${s.key}`} className="mt-3 text-sm font-semibold text-accent-text">
				All {jobsText(s.count)} in {s.label} →
			</Link>
		</li>
	);
}
