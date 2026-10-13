// Runs before routing (Next.js 16 "proxy", formerly middleware), on every request except Next.js's
// own static files.
// 1. /healthz: health check for TrueFoundry's probes. Answered here rather than as a page route, so
//    Next.js's routing data in every page stays unchanged. "ok" while the server runs; no database
//    call (a short database hiccup must not restart the site), never cached, never indexed, not in
//    the sitemap, disallowed in robots.txt.
// 2. Search-engine block: when ALLOW_INDEXING is off (the default; lib/site.ts), every response gets
//    "X-Robots-Tag: noindex, nofollow". When it is on, responses are left exactly as they are.
// 3. Uppercase addresses (SEO audit 2026-10-12, 1.7): /FPA-Jobs/Texas -> 301 to /fpa-jobs/texas (query
//    string kept), so links with capitals still reach the one canonical page. Every site URL is
//    lowercase. Payload's /admin and /api are left alone. The redirect goes to SITE_URL (the public
//    domain; Next.js needs an absolute URL here), never to an internal host behind the CDN.
import { type NextRequest, NextResponse } from "next/server";
import { indexingAllowed, siteUrl } from "@/lib/site";

const NO_INDEX = "noindex, nofollow";

export function proxy(request: NextRequest): NextResponse {
	const { pathname, search } = request.nextUrl;
	if (pathname === "/healthz") {
		return new NextResponse("ok", {
			headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-robots-tag": NO_INDEX },
		});
	}
	if (/[A-Z]/.test(pathname) && !/^\/(admin|api)(\/|$)/i.test(pathname)) {
		const redirect = NextResponse.redirect(`${siteUrl()}${pathname.toLowerCase()}${search}`, 301);
		if (!indexingAllowed()) redirect.headers.set("x-robots-tag", NO_INDEX);
		return redirect;
	}
	const response = NextResponse.next();
	if (!indexingAllowed()) response.headers.set("x-robots-tag", NO_INDEX);
	return response;
}

export const config = {
	// Everything except Next.js's hashed static files and image optimizer.
	matcher: "/((?!_next/static|_next/image).*)",
};
