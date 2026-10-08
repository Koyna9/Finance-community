import type { Metadata } from "next";
import AzIndex from "@/components/AzIndex";
import { getGroupCounts, minJobsPerPage } from "@/lib/db";
import { canonicalUrl } from "@/lib/seo";

// A–Z list of job titles with MIN_JOBS_PER_PAGE+ open jobs (the same rule as their pages).
export const dynamic = "force-dynamic";

const PATH = "/titles";

export async function generateMetadata(): Promise<Metadata> {
	return {
		title: "Finance Job Titles A–Z",
		description:
			"Every finance job title with open roles at US companies, from accountant to CFO, with the number of open jobs for each.",
		alternates: { canonical: canonicalUrl(PATH) },
	};
}

export default async function TitlesPage() {
	const [titles, min] = await Promise.all([getGroupCounts("title"), minJobsPerPage()]);
	return (
		<AzIndex
			title="Finance Job Titles A–Z"
			intro={`${titles.length} job ${titles.length === 1 ? "title" : "titles"} with ${min}+ open ${min === 1 ? "job" : "jobs"} each. Pick one to see every open role with that title.`}
			crumb="Job titles"
			path={PATH}
			items={titles.map((t) => ({ href: `/titles/${t.key}`, label: t.label, count: t.count }))}
			filter={{ label: "Search job titles", placeholder: "Search titles, e.g. Analyst", noun: ["title", "titles"] }}
		/>
	);
}
