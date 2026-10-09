import type { MetadataRoute } from "next";
import { indexingAllowed, siteUrl } from "@/lib/site";

// /robots.txt (SEO rule 6): everything is allowed except Payload's admin and API and the health check.
// With ALLOW_INDEXING off (the default, e.g. on a temporary address) it disallows everything.
// Per request, so settings are read at run time (never at build time).
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
	if (!indexingAllowed()) return { rules: { userAgent: "*", disallow: "/" } };
	return {
		rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/healthz"] },
		sitemap: `${siteUrl()}/sitemap.xml`,
	};
}
