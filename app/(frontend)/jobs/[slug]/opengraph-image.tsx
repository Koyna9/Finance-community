import { getJobBySlug } from "@/lib/db";
import { categoryInfo, jobPayShort, placeLabel } from "@/lib/format";
import { OG_SIZE, OG_TYPE, ogCard } from "@/lib/og";

// Share picture of a job page: title, company, place and the pay as the employer states it.
// Rendered on request (it reads the database; nothing at build time).
export const dynamic = "force-dynamic";
export const alt = "Finance job: title, company, location and stated pay";
export const size = OG_SIZE;
export const contentType = OG_TYPE;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
	const job = await getJobBySlug((await params).slug);
	if (!job) {
		return ogCard({ eyebrow: "US finance jobs", title: "Finance roles at US companies, straight from their hiring pages." });
	}
	const role = categoryInfo(job.category)?.label ?? "Finance";
	return ogCard({
		eyebrow: `${role} job · ${placeLabel(job)}`,
		title: job.clean_title,
		subtitle: job.company,
		highlight: job.status === "open" ? jobPayShort(job) : "This role has closed",
	});
}
