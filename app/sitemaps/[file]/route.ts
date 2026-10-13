import { SITEMAP_TYPES, sitemapPart, type SitemapType } from "@/lib/sitemap";

// /sitemaps/<type>.xml: one part of the sitemap (pages, locations, titles, companies, salaries, jobs).
// Per request, so it always matches the database. Anything else is a 404.
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }): Promise<Response> {
	const type = (await params).file.replace(/\.xml$/, "") as SitemapType;
	if (!(await params).file.endsWith(".xml") || !SITEMAP_TYPES.includes(type)) {
		return new Response("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
	}
	return sitemapPart(type);
}
