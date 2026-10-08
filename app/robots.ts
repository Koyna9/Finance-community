import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// /robots.txt (SEO rule 6): everything is allowed except Payload's admin and API.
// Per request, so SITE_URL is read at run time (never at build time).
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
	return {
		rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api"] },
		sitemap: `${siteUrl()}/sitemap.xml`,
	};
}
