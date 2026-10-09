// Runs before routing (Next.js 16 "proxy", formerly middleware).
// /healthz: health check for TrueFoundry's probes. Answered here rather than as a page route, so
// Next.js's routing data in every page stays unchanged. Answers "ok" while the server runs; no
// database call (a short database hiccup must not restart the site), never cached, never indexed,
// not in the sitemap, disallowed in robots.txt.
import { NextResponse } from "next/server";

export function proxy(): NextResponse {
	return new NextResponse("ok", {
		headers: {
			"content-type": "text/plain; charset=utf-8",
			"cache-control": "no-store",
			"x-robots-tag": "noindex, nofollow",
		},
	});
}

export const config = {
	matcher: "/healthz",
};
