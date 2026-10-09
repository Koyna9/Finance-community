// Next.js page cache (SEO rule 7): job pages and salary-category pages are cached for up to
// 15 minutes. refreshCachedPages() makes their next visit render fresh, e.g. right after a job is
// hidden in /admin. It works inside the running site (/admin and /api requests). In scripts (sync,
// load-jobs) Next.js isn't running, so it does nothing; those pages then refresh within 15 minutes.
import { revalidatePath } from "next/cache";
import { after } from "next/server";

// Route patterns as Next.js labels the cached pages: the folder path INCLUDING the route group
// "(frontend)". "/jobs/[slug]" would match nothing and refresh nothing.
const CACHED_PAGES = ["/(frontend)/jobs/[slug]", "/(frontend)/salaries/[category]"];

function revalidateAll(): void {
	for (const path of CACHED_PAGES) revalidatePath(path, "page");
}

export function refreshCachedPages(): void {
	try {
		revalidateAll();
		// Payload runs hooks BEFORE the database commit, so a visit in between could re-cache the
		// old page: refresh once more after the response (= after the commit).
		after(() => {
			try {
				revalidateAll();
			} catch {
				// ignore: the first refresh already happened
			}
		});
	} catch {
		// Not inside a Next.js request (e.g. a script): nothing to refresh here.
	}
}
