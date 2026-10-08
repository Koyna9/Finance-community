import type { Metadata } from "next";
import AzIndex from "@/components/AzIndex";
import { getGroupCounts } from "@/lib/db";
import { canonicalUrl } from "@/lib/seo";

// A–Z list of companies with open jobs (CLAUDE.md section 9).
export const dynamic = "force-dynamic";

const PATH = "/companies";

export async function generateMetadata(): Promise<Metadata> {
	return {
		title: "Companies Hiring for Finance Roles A–Z",
		description:
			"US companies with open finance jobs right now, A–Z, with the number of open roles at each. Apply on each company's own site.",
		alternates: { canonical: canonicalUrl(PATH) },
	};
}

export default async function CompaniesPage() {
	const companies = await getGroupCounts("company", {}, 1);
	return (
		<AzIndex
			title="Companies Hiring for Finance Roles"
			intro={`${companies.length} ${companies.length === 1 ? "company has" : "companies have"} open finance jobs right now. Pick one to see its roles.`}
			crumb="Companies"
			path={PATH}
			items={companies.map((c) => ({ href: `/companies/${c.key}`, label: c.label, count: c.count }))}
			filter={{ label: "Search companies", placeholder: "Search companies by name", noun: ["company", "companies"] }}
		/>
	);
}
