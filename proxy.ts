// Runs before routing (Next.js 16 "proxy", formerly middleware), on every request except Next.js's
// own static files.
// 1. /healthz: health check for TrueFoundry's probes. Answered here rather than as a page route, so
//    Next.js's routing data in every page stays unchanged. "ok" while the server runs; no database
//    call (a short database hiccup must not restart the site), never cached, never indexed, not in
//    the sitemap, disallowed in robots.txt.
// 2. Search-engine block: when ALLOW_INDEXING is off (the default; lib/site.ts), every response gets
//    "X-Robots-Tag: noindex, nofollow". When it is on, responses are left exactly as they are.
import { type NextRequest, NextResponse } from "next/server";
import { indexingAllowed } from "@/lib/site";

const NO_INDEX = "noindex, nofollow";

export function proxy(request: NextRequest): NextResponse {
	if (request.nextUrl.pathname === "/healthz") {
		return new NextResponse("ok", {
			headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-robots-tag": NO_INDEX },
		});
	}
	const response = NextResponse.next();
	if (!indexingAllowed()) response.headers.set("x-robots-tag", NO_INDEX);
	return response;
}

export const config = {
	// Everything except Next.js's hashed static files and image optimizer.
	matcher: "/((?!_next/static|_next/image).*)",
};
