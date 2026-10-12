import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ApplyButton from "@/components/ApplyButton";
import Breadcrumbs, { type Crumb } from "@/components/Breadcrumbs";
import Chip from "@/components/Chip";
import CompanyTile from "@/components/CompanyTile";
import JobCard from "@/components/JobCard";
import JsonLd from "@/components/JsonLd";
import { MIN_PAY_LISTINGS as MIN_SALARY_LISTINGS } from "@/components/PayStrip";
import SidebarBox, { PillLinks, type SidebarLink } from "@/components/SidebarBox";
import {
	countsInPayFigures,
	getCategoryPlaceCounts,
	getJobBySlug,
	getPayStats,
	getSimilarJobs,
	minJobsPerPage,
	payMidpoint,
	type Job,
	type PayStats,
} from "@/lib/db";
import {
	categoryInfo,
	employmentTypeLabel,
	jobPayFull,
	levelLabel,
	paragraphs,
	placeLabel,
	sentences,
	shortUsd,
	timeAgoLong,
	workStyleLabel,
} from "@/lib/format";
import { canonicalUrl, jobDescription, jobPostingJsonLd, jobTitle } from "@/lib/seo";

// SEO rule 7: each job page is rendered on its first visit, then served from Next.js's page cache
// and refreshed at most every 15 minutes (nothing is rendered at build time: no database needed
// then). Changing a job in /admin refreshes job pages at once (collections/Jobs.ts).
export const revalidate = 900;
export async function generateStaticParams(): Promise<{ slug: string }[]> {
	return [];
}

const SIMILAR_OPEN = 3; // sidebar, open job
const SIMILAR_CLOSED = 5; // main column, closed job
const MIN_PAY_LISTINGS = 5; // pay benchmark only when 5+ jobs state pay

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const job = await getJobBySlug((await params).slug);
	if (!job) notFound();
	return {
		title: jobTitle(job),
		description: jobDescription(job),
		alternates: { canonical: canonicalUrl(`/jobs/${job.slug}`) },
		// Closed jobs stay visible but are not indexed (SEO rule 5).
		...(job.status === "open" ? {} : { robots: { index: false, follow: true } }),
	};
}

const card = "rounded-[10px] border border-border bg-surface p-6";

export default async function JobPage({ params }: Props) {
	const job = await getJobBySlug((await params).slug);
	if (!job) notFound();

	const open = job.status === "open";
	const cat = categoryInfo(job.category);
	const roleLabel = cat?.shortLabel ?? "Finance";
	const [min, placeCounts, similar, payStats, usPay] = await Promise.all([
		minJobsPerPage(),
		getCategoryPlaceCounts(job.category, job.state_slug, job.city_slug),
		getSimilarJobs(job, open ? SIMILAR_OPEN : SIMILAR_CLOSED),
		job.state_slug ? getPayStats({ category: job.category, stateSlug: job.state_slug }) : null,
		getPayStats({ category: job.category }), // does /salaries/<category> exist?
	]);

	// Category place pages that pass the thin-page rule (never link to a 404).
	const catPath = cat?.path ?? "/finance-jobs";
	const statePath = job.state && placeCounts.state >= min ? `${catPath}/${job.state_slug}` : null;
	const cityPath = statePath && job.city && placeCounts.city >= min ? `${statePath}/${job.city_slug}` : null;

	const crumbs: Crumb[] = [{ label: `${roleLabel} jobs`, href: catPath }];
	if (job.state) crumbs.push({ label: job.state, href: statePath ?? undefined, current: false });
	if (job.state && job.city) crumbs.push({ label: job.city, href: cityPath ?? undefined, current: false });

	const placeLinks: SidebarLink[] = [];
	if (cityPath) placeLinks.push({ href: cityPath, label: `${roleLabel} jobs in ${job.city}` });
	if (statePath) placeLinks.push({ href: statePath, label: `${roleLabel} jobs in ${job.state}` });
	placeLinks.push({ href: catPath, label: `All ${roleLabel} jobs` });
	// The role's salary page exists only when 5+ US jobs in the role state pay.
	const rolePay = cat && usPay && usPay.withPay >= MIN_SALARY_LISTINGS ? usPay : null;

	const pay = jobPayFull(job); // as the employer states it: per year, per hour, ...
	const workStyle = workStyleLabel(job.work_arrangement);
	const employment = employmentTypeLabel(job.employment_type); // also in JobPosting (employmentType)
	const posted = timeAgoLong(job.date_posted);
	const requirements = sentences(job.requirements);
	const description = paragraphs(job.description);
	const similarNearby = job.state_slug !== null && similar.length > 0 && similar.every((s) => s.state_slug === job.state_slug);
	// Its company page exists while the company has an open job; this open job guarantees one.
	const companyPath = open && job.company_slug ? `/companies/${job.company_slug}` : null;
	const jobPosting = jobPostingJsonLd(job); // open jobs only (SEO rule 4)

	return (
		<>
			{jobPosting && <JsonLd data={jobPosting} />}
			{/* White top band */}
			<section className="border-b border-border bg-surface">
				<div className="mx-auto flex max-w-[1200px] flex-col gap-[18px] px-6 pb-[30px] pt-[22px]">
					<Breadcrumbs items={crumbs} />
					<div className="flex flex-wrap items-start justify-between gap-6">
						<div className="flex min-w-0 flex-[999_1_520px] items-start gap-[18px]">
							<CompanyTile company={job.company} logo={job.logo} size={64} />
							<div className="flex min-w-0 flex-col gap-2">
								{job.company &&
									(companyPath ? (
										<Link href={companyPath} className="text-base font-medium text-text-2">
											{job.company}
										</Link>
									) : (
										<span className="text-base font-medium text-text-2">{job.company}</span>
									))}
								<h1 className="text-[28px] font-bold leading-[1.15] tracking-[-0.02em] sm:text-4xl">{job.clean_title}</h1>
								<div className="mt-1 flex flex-wrap items-center gap-2">
									<Chip icon="pin" large>
										{placeLabel(job)}
									</Chip>
									{workStyle && <Chip large>{workStyle}</Chip>}
									{employment && <Chip large>{employment}</Chip>}
									<Chip large>{levelLabel(job.level, true)}</Chip>
									{cat && <Chip large>{cat.label}</Chip>}
									{posted && <span className="px-1 py-1.5 text-sm text-muted">Posted {posted}</span>}
								</div>
							</div>
						</div>

						{open ? (
							<PayBox job={job} pay={pay} />
						) : (
							<div className="flex min-w-0 flex-[1_1_300px] flex-col gap-2 rounded-xl border border-border-strong bg-chip p-5">
								<h2 className="text-lg font-bold">This role has closed</h2>
								<p className="text-sm leading-normal text-text-2">
									The employer is no longer taking applications for this job.
									{similar.length > 0 && (
										<>
											{" "}
											<a href="#similar" className="font-semibold text-accent-text">
												See similar open jobs ↓
											</a>
										</>
									)}
								</p>
							</div>
						)}
					</div>
				</div>
			</section>

			<main className="mx-auto flex max-w-[1200px] flex-wrap items-start gap-8 px-6 pb-16 pt-8">
				<article className="flex min-w-0 flex-[999_1_560px] flex-col gap-5">
					{!open && similar.length > 0 && (
						<section aria-labelledby="similar" className="flex flex-col gap-3.5">
							<h2 id="similar" className="text-xl font-bold">
								Similar open {roleLabel} jobs
							</h2>
							{similar.map((s) => (
								<JobCard key={s.id} job={s} variant="compact" />
							))}
						</section>
					)}

					{job.summary && (
						<section aria-labelledby="glance" className={card}>
							<h2 id="glance" className="mb-2.5 text-xl font-bold">
								The role at a glance
							</h2>
							<p className="text-base leading-[1.65] text-text-body">{job.summary}</p>
						</section>
					)}

					{requirements.length > 0 && (
						<section aria-labelledby="need" className={card}>
							<h2 id="need" className="mb-3 text-xl font-bold">
								What they&apos;re looking for
							</h2>
							<ul className="flex list-disc flex-col gap-2 pl-5 text-base leading-[1.55] text-text-body">
								{requirements.map((r, i) => (
									<li key={i}>{r}</li>
								))}
							</ul>
						</section>
					)}

					{description.length > 0 && (
						<section aria-labelledby="full" className={`${card} flex flex-col gap-3`}>
							<div className="flex flex-wrap items-baseline justify-between gap-3">
								<h2 id="full" className="text-xl font-bold">
									Full job description
								</h2>
								<span className="text-[13px] text-muted">From the employer&apos;s listing</span>
							</div>
							{description.map((p, i) => (
								<p key={i} className="whitespace-pre-line break-words text-base leading-[1.7] text-text-body">
									{p}
								</p>
							))}
						</section>
					)}

					{open && job.apply_url && <ApplyButton href={job.apply_url} />}
				</article>

				<aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-5">
					{payStats && payStats.withPay >= MIN_PAY_LISTINGS && job.state && (
						<PayBenchmark job={job} stats={payStats} roleLabel={roleLabel} state={job.state} />
					)}

					{job.company && (
						<SidebarBox id="company" title="About the company">
							<dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
								<dt className="text-muted">Company</dt>
								<dd>{job.company}</dd>
								{job.company_industry && (
									<>
										<dt className="text-muted">Industry</dt>
										<dd>{job.company_industry}</dd>
									</>
								)}
								{job.company_size && (
									<>
										<dt className="text-muted">Size</dt>
										<dd>{job.company_size}</dd>
									</>
								)}
							</dl>
							{companyPath && (
								<Link
									href={companyPath}
									className="mt-3 inline-block text-sm font-semibold text-accent-text"
								>
									All jobs at {job.company} →
								</Link>
							)}
						</SidebarBox>
					)}
					{/* Same look as SidebarBox, plus the home page's "$" coin in the heading */}
					{cat && rolePay && (
						<section aria-labelledby="role-pay" className="group/pay rounded-[10px] border border-border bg-surface p-5">
							{/* The coin sits next to the heading, not inside it, so the heading text stays clean */}
							<div className="mb-3 flex items-center gap-2">
								<h2 id="role-pay" className="text-[17px] font-bold">
									Compare {roleLabel} salaries
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
							<div className="flex flex-col gap-0.5">
								<span className="text-[13px] text-muted">US median pay</span>
								<span className="font-mono text-[22px] font-semibold text-accent-text">{shortUsd(rolePay.median)}</span>
							</div>
							<p className="mt-2 text-sm leading-normal text-text-2">
								Yearly, from {rolePay.withPay} open full-time {roleLabel} listings that state pay.
							</p>
							<Link href={`/salaries/${cat.key}`} className="mt-3 inline-block text-sm font-semibold text-accent-text">
								See {roleLabel} salaries by state →
							</Link>
						</section>
					)}

					<SidebarBox
						id="more"
						title={open ? `More ${roleLabel} jobs${similarNearby ? " nearby" : ""}` : `Browse ${roleLabel} jobs`}
					>
						{open && similar.length > 0 && (
							<ul className="mb-2">
								{similar.map((s) => (
									<li key={s.id} className="flex flex-col gap-[3px] border-t border-border-soft py-3">
										<Link href={`/jobs/${s.slug}`} className="text-[15px] font-semibold">
											{s.clean_title}
										</Link>
										<span className="text-[13px] text-muted">
											{[s.company, placeLabel(s)].filter(Boolean).join(" · ")}
										</span>
									</li>
								))}
							</ul>
						)}
						<PillLinks links={placeLinks} />
					</SidebarBox>
				</aside>
			</main>
		</>
	);
}

// "OWL Services'" / "Stripe's" / "the employer's"
function possessive(company: string | null): string {
	if (!company) return "the employer's";
	return /s$/i.test(company) ? `${company}'` : `${company}'s`;
}

// Pay box on the right of the top band (open jobs only). Pay in the unit the employer states it.
function PayBox({ job, pay }: { job: Job; pay: { amount: string; per: string } | null }) {
	return (
		<div className="flex min-w-0 flex-[1_1_300px] flex-col gap-3 rounded-xl border border-border bg-surface-2 p-5">
			{pay ? (
				<div className="flex flex-col gap-1">
					<span className="text-[13px] text-muted">Pay stated by employer</span>
					<span className="font-mono text-[22px] font-semibold text-accent-text sm:text-[24px]">{pay.amount}</span>
					<span className="text-[13px] text-muted">{pay.per}</span>
				</div>
			) : (
				<span className="font-mono text-lg font-semibold text-muted">Pay not stated</span>
			)}
			{job.apply_url && <ApplyButton href={job.apply_url} fullWidth />}
			<span className="text-[13px] leading-[1.45] text-muted">
				You&apos;ll apply on {possessive(job.company)} own careers page.
			</span>
		</div>
	);
}

// "<Role> pay in <State>": low / median / high + how this job compares (only when this job's pay
// is itself comparable: not part-time, contract, temporary or an internship).
function PayBenchmark({ job, stats, roleLabel, state }: { job: Job; stats: PayStats; roleLabel: string; state: string }) {
	const mid = countsInPayFigures(job) ? payMidpoint(job.pay_min, job.pay_max) : null;
	let compare = "";
	if (mid) {
		const diff = (mid - stats.median) / stats.median;
		const where = diff > 0.05 ? "above" : diff < -0.05 ? "below" : "close to";
		compare = `This role pays ${where} the ${state} ${roleLabel} median. `;
	}
	return (
		<SidebarBox id="paybench" title={`${roleLabel} pay in ${state}`}>
			<div className="grid grid-cols-3 gap-2">
				{[
					{ label: "Low", value: stats.low, accent: false },
					{ label: "Median", value: stats.median, accent: true },
					{ label: "High", value: stats.high, accent: false },
				].map((c) => (
					<div key={c.label} className="flex flex-col gap-0.5">
						<span className="text-xs text-muted">{c.label}</span>
						<span className={`font-mono text-[17px] font-semibold ${c.accent ? "text-accent-text" : ""}`}>
							{shortUsd(c.value)}
						</span>
					</div>
				))}
			</div>
			<p className="mt-3 text-sm leading-normal text-text-2">
				{compare}Based on {stats.withPay} full-time listings that state pay.
			</p>
		</SidebarBox>
	);
}
