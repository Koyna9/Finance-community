import type { MetadataRoute } from "next";
import {
	countJobs,
	getCategoryCounts,
	getGroupCounts,
	getLevelCounts,
	getPayByGroup,
	getSitemapJobs,
	getSitemapPlaces,
	minJobsPerPage,
} from "@/lib/db";
import { MIN_PAY_LISTINGS } from "@/components/PayStrip";
import { CATEGORY_LIST, categoryInfo, LEVELS, levelPath } from "@/lib/format";
import { canonicalUrl } from "@/lib/seo";

// /sitemap.xml (SEO rule 6), built from the database at request time. Lists only pages that exist
// (thin-page rule, page 1 only) and every open, non-hidden job. Closed and hidden jobs are left out.
// One file holds up to 50,000 URLs; split with generateSitemaps() if we ever get near that.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const [min, categoryCounts, levelCounts, remoteTotal, remoteByCategory, places, titles, companies, pay, jobs] =
		await Promise.all([
			minJobsPerPage(),
			getCategoryCounts(),
			getLevelCounts(),
			countJobs({ remote: true }),
			getGroupCounts("category", { remote: true }),
			getSitemapPlaces(),
			getGroupCounts("title"),
			getGroupCounts("company"), // MIN_JOBS_PER_PAGE+: thinner company pages are noindex
			getPayByGroup("category", {}, MIN_PAY_LISTINGS),
			getSitemapJobs(),
		]);

	const paths: string[] = [
		"/",
		"/finance-jobs",
		"/locations",
		"/titles",
		"/companies",
		"/salaries",
		"/about",
		"/how-we-source-jobs",
	];
	// National list pages with jobs.
	for (const c of CATEGORY_LIST) if (categoryCounts[c.key]) paths.push(c.path);
	for (const l of LEVELS) if (levelCounts[l]) paths.push(levelPath(l));
	// Remote pages.
	if (remoteTotal > 0) paths.push("/finance-jobs/remote");
	for (const r of remoteByCategory) paths.push(`${categoryInfo(r.key)!.path}/remote`);
	// State and city pages (already filtered to MIN_JOBS_PER_PAGE+ open jobs).
	for (const p of places) {
		const base = p.category ? categoryInfo(p.category)!.path : "/finance-jobs";
		paths.push(p.city ? `${base}/${p.state}/${p.city}` : `${base}/${p.state}`);
	}
	for (const t of titles) if (t.count >= min) paths.push(`/titles/${t.key}`);
	for (const c of companies) paths.push(`/companies/${c.key}`);
	for (const p of pay) paths.push(`/salaries/${p.key}`);

	return [
		...paths.map((path) => ({ url: canonicalUrl(path) })),
		...jobs.map((j) => ({ url: canonicalUrl(`/jobs/${j.slug}`), lastModified: j.updatedAt })),
	];
}
