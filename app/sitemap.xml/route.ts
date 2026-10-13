import { sitemapIndex } from "@/lib/sitemap";

// /sitemap.xml: index of the sitemap parts (lib/sitemap.ts). robots.txt and Search Console point here.
// Per request, so it always matches the database (never built at build time).
export const dynamic = "force-dynamic";

export function GET(): Promise<Response> {
	return sitemapIndex();
}
