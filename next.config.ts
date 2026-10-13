import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	// Don't let `next dev` write its own block into CLAUDE.md (our project brief).
	agentRules: false,
	// Always put <title>, meta description and the canonical tag in <head> (SEO rule 1), for every
	// visitor including Googlebot. By default Next.js streams them into <body> for most user agents,
	// and Google ignores a canonical link outside <head>.
	htmlLimitedBots: /.*/,
	// Cached pages (job + salary pages, revalidate 900) send "s-maxage=900, stale-while-revalidate=900":
	// a CDN (CloudFront) may serve an old copy for at most 30 minutes in total. Next.js's default is
	// one year of stale-while-revalidate, which kept outdated copies (e.g. old canonicals) on the CDN.
	expireTime: 1800,
	// /jobs has no page of its own (CLAUDE.md section 9).
	async redirects() {
		return [{ source: "/jobs", destination: "/finance-jobs", permanent: true }];
	},
	experimental: {
		// The site (app/(frontend)) and Payload's admin (app/(payload)) each have their own root
		// layout, so unknown URLs use app/global-not-found.tsx.
		globalNotFound: true,
	},
};

export default withPayload(nextConfig, { devBundleServerPackages: false });
