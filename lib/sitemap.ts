// Sitemaps (SEO rule 6), split by page type (SEO audit 2026-10-12, 1.4) so Search Console shows
// indexing per type: /sitemap.xml is the index, /sitemaps/<type>.xml the parts. Built from the
// database at request time. Lists only pages that exist (thin-page rule, page 1 only) and every
// open, non-hidden job; closed and hidden jobs are left out. lastmod = the latest real change to a
// job on that page (none for the plain text pages). Each part stays far below 50,000 URLs.

import { MIN_PAY_LISTINGS } from "@/components/PayStrip";
import {
	countJobs,
	getCategoryCounts,
	getGroupCounts,
	getLastChanges,
	getLevelCounts,
	getPayByGroup,
	getSitemapJobs,
	getSitemapPlaces,
	getTitleSalaries,
} from "@/lib/db";
import { CATEGORY_LIST, categoryInfo, LEVELS, levelPath } from "@/lib/format";
import { canonicalUrl } from "@/lib/seo";

export const SITEMAP_TYPES = ["pages", "locations", "titles", "companies", "salaries", "jobs"] as const;
export type SitemapType = (typeof SITEMAP_TYPES)[number];

type Entry = { path: string; lastmod?: string };

async function entries(type: SitemapType): Promise<Entry[]> {
	switch (type) {
		case "pages": {
			const [all, byCategory, byLevel, remoteAll, remoteByCategory, categoryCounts, levelCounts, remoteTotal, remoteCats] =
				await Promise.all([
					getLastChanges("all"),
					getLastChanges("category"),
					getLastChanges("level"),
					getLastChanges("all", true),
					getLastChanges("category", true),
					getCategoryCounts(),
					getLevelCounts(),
					countJobs({ remote: true }),
					getGroupCounts("category", { remote: true }),
				]);
			const latest = all[""];
			const list: Entry[] = [
				{ path: "/", lastmod: latest },
				{ path: "/finance-jobs", lastmod: latest },
				{ path: "/locations", lastmod: latest },
				{ path: "/titles", lastmod: latest },
				{ path: "/companies", lastmod: latest },
				{ path: "/about" },
				{ path: "/how-we-source-jobs" },
			];
			// National list pages with jobs.
			for (const c of CATEGORY_LIST) if (categoryCounts[c.key]) list.push({ path: c.path, lastmod: byCategory[c.key] });
			for (const l of LEVELS) if (levelCounts[l]) list.push({ path: levelPath(l), lastmod: byLevel[l] });
			// Remote pages.
			if (remoteTotal > 0) list.push({ path: "/finance-jobs/remote", lastmod: remoteAll[""] });
			for (const r of remoteCats) list.push({ path: `${categoryInfo(r.key)!.path}/remote`, lastmod: remoteByCategory[r.key] });
			return list;
		}
		case "locations": {
			// State and city pages (already filtered to MIN_JOBS_PER_PAGE+ open jobs).
			const places = await getSitemapPlaces();
			return places.map((p) => {
				const base = p.category ? categoryInfo(p.category)!.path : "/finance-jobs";
				return { path: p.city ? `${base}/${p.state}/${p.city}` : `${base}/${p.state}`, lastmod: p.lastmod };
			});
		}
		case "titles": {
			const [titles, changes] = await Promise.all([getGroupCounts("title"), getLastChanges("title")]);
			return titles.map((t) => ({ path: `/titles/${t.key}`, lastmod: changes[t.key] }));
		}
		case "companies": {
			// MIN_JOBS_PER_PAGE+ open jobs: thinner company pages are noindex.
			const [companies, changes] = await Promise.all([getGroupCounts("company"), getLastChanges("company")]);
			return companies.map((c) => ({ path: `/companies/${c.key}`, lastmod: changes[c.key] }));
		}
		case "salaries": {
			const [pay, titles, all, byCategory, byTitle] = await Promise.all([
				getPayByGroup("category", {}, MIN_PAY_LISTINGS),
				getTitleSalaries(MIN_PAY_LISTINGS),
				getLastChanges("all"),
				getLastChanges("category"),
				getLastChanges("title"),
			]);
			return [
				{ path: "/salaries", lastmod: all[""] },
				...pay.map((p) => ({ path: `/salaries/${p.key}`, lastmod: byCategory[p.key] })),
				...titles.map((t) => ({ path: `/salaries/titles/${t.key}`, lastmod: byTitle[t.key] })),
			];
		}
		case "jobs": {
			const jobs = await getSitemapJobs();
			return jobs.map((j) => ({ path: `/jobs/${j.slug}`, lastmod: new Date(j.updatedAt).toISOString() }));
		}
	}
}

const xmlEscape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const lastmodTag = (lastmod?: string) => (lastmod ? `\n<lastmod>${lastmod}</lastmod>` : "");

function xmlResponse(body: string): Response {
	return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n${body}\n`, {
		headers: { "content-type": "application/xml; charset=utf-8" },
	});
}

// /sitemaps/<type>.xml
export async function sitemapPart(type: SitemapType): Promise<Response> {
	const list = await entries(type);
	const urls = list.map((e) => `<url>\n<loc>${xmlEscape(canonicalUrl(e.path))}</loc>${lastmodTag(e.lastmod)}\n</url>`);
	return xmlResponse(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`);
}

// /sitemap.xml: the index of the parts; each part's lastmod is its newest entry.
export async function sitemapIndex(): Promise<Response> {
	const parts = await Promise.all(
		SITEMAP_TYPES.map(async (type) => {
			const list = await entries(type);
			const newest = list.reduce<string | undefined>((max, e) => (e.lastmod && (!max || e.lastmod > max) ? e.lastmod : max), undefined);
			return `<sitemap>\n<loc>${xmlEscape(canonicalUrl(`/sitemaps/${type}.xml`))}</loc>${lastmodTag(newest)}\n</sitemap>`;
		}),
	);
	return xmlResponse(`<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${parts.join("\n")}\n</sitemapindex>`);
}
