// Site-wide constants. The site name (design/DESIGN.md) is set only here.

export const SITE_NAME = "finance-community";

export const SITE_DESCRIPTION =
	"Finance jobs from US employers' own hiring pages. You apply directly with the company.";

// Absolute site address for canonical tags and structured data (CLAUDE.md section 4):
// http://localhost:3000 locally (.env.local), the live domain online. No trailing slash.
export function siteUrl(): string {
	const url = process.env.SITE_URL?.trim().replace(/\/+$/, "");
	if (url) return url.toLowerCase();
	if (process.env.NODE_ENV === "production") throw new Error("SITE_URL is not set");
	return "http://localhost:3000";
}
