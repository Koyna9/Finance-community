import { ogCard } from "@/lib/og";

// /og.png: the site-wide share picture (socialMetadata in lib/seo.ts names it on every page; job and
// salary pages override it with their own opengraph-image). No database: built once at build time.
export const dynamic = "force-static";

export function GET() {
	return ogCard({
		eyebrow: "US finance jobs · updated every night",
		title: "Finance roles at US companies, straight from their hiring pages.",
		subtitle: "Accounting, FP&A, tax, audit and more, by state, city, level and company.",
	});
}
