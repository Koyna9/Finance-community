import type { Metadata } from "next";
import Link from "next/link";
import InfoPage, { InfoSection } from "@/components/InfoPage";
import { MIN_PAY_LISTINGS } from "@/components/PayStrip";
import { CATEGORY_LIST } from "@/lib/format";
import { canonicalUrl, socialMetadata } from "@/lib/seo";
import { SITE_NAME } from "@/lib/site";

// How we source jobs (SEO audit 2026-10-12, section 6): where the jobs come from, how they are
// sorted and kept fresh, and the stated-pay-only rule. Every sentence must stay true of the code
// (CLAUDE.md sections 6, 8, 10); update it when those rules change.
export const dynamic = "force-dynamic";

const PATH = "/how-we-source-jobs";

export async function generateMetadata(): Promise<Metadata> {
	const title = "How We Source Jobs";
	const description =
		"Where our finance jobs come from: employers' own careers sites, checked every night for closed jobs. " +
		"Pay only when the employer states it, never estimated.";
	return { title, description, alternates: { canonical: canonicalUrl(PATH) }, ...socialMetadata(title, description, PATH) };
}

export default function HowWeSourceJobsPage() {
	return (
		<InfoPage
			path={PATH}
			crumb="How we source jobs"
			title="How we source jobs"
			intro={`Every job on ${SITE_NAME} comes from an employer's own careers site. Here is how we find, sort and update them.`}
		>
			<InfoSection id="where" title="Where the jobs come from">
				<p>
					We collect job postings from the careers sites and applicant tracking systems that employers use to publish
					their openings, through a job-data provider that reads them. We only list jobs located in the United States,
					and we leave out recruitment agencies, so every listing is a role at the company that posts it.
				</p>
				<p>
					When you click &quot;Apply on company site&quot;, you go to the employer&apos;s own job page. We never see or
					handle your application.
				</p>
			</InfoSection>

			<InfoSection id="which" title="Which jobs we list">
				<p>
					We list finance roles only. Each job is sorted by its title into one of eight areas (
					{CATEGORY_LIST.map((c) => c.label).join(", ")}) and one of four experience levels: entry, mid, senior and
					lead. Jobs whose title doesn&apos;t match a finance role are left out, and we can hide any listing that turns
					out not to be a real finance job.
				</p>
			</InfoSection>

			<InfoSection id="fresh" title="How we keep the list fresh">
				<p>
					Every night we check which jobs the employers have closed. A closed job stays reachable, clearly marked
					&quot;This role has closed&quot; with similar open jobs, but it leaves every list, search engines are asked
					not to show it, and it is removed from our sitemap.
				</p>
			</InfoSection>

			<InfoSection id="text" title="What's on a job page">
				<p>
					The full job description is the employer&apos;s own text. &quot;The role at a glance&quot; and &quot;What
					they&apos;re looking for&quot; are short summaries generated automatically from that description, to help
					you scan it quickly. Always check the employer&apos;s listing for the details.
				</p>
			</InfoSection>

			<InfoSection id="pay" title="Pay: stated by the employer, never estimated">
				<ul className="flex list-disc flex-col gap-2 pl-5">
					<li>We show pay only when the employer states it in US dollars. Otherwise the job says &quot;Pay not stated&quot;.</li>
					<li>Pay is shown the way the employer states it: per year, or per hour or month.</li>
					<li>
						Our{" "}
						<Link href="/salaries" className="font-semibold text-accent-text">
							salary figures
						</Link>{" "}
						are yearly (hourly pay × 2,080 hours, a full-time year) and use only full-time jobs: part-time, contract,
						temporary and internship pay is left out. A figure is shown only when {MIN_PAY_LISTINGS} or more listings
						state pay.
					</li>
				</ul>
			</InfoSection>
		</InfoPage>
	);
}
