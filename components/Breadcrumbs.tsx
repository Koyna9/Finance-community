import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo";

// current: false for a place that is shown but not linked (its page would be under the thin-page minimum).
export type Crumb = { label: string; href?: string; current?: boolean };

// Home › FP&A jobs › Texas › Austin. Give the current page as the last item WITHOUT href:
// it is shown as plain dark text. (The job page's trail ends in a link: its city page.)
// Also outputs the matching BreadcrumbList JSON-LD (SEO rule 3); `path` is the current page's
// URL path, so the current page is in the structured data too.
export default function Breadcrumbs({ items, path }: { items: Crumb[]; path?: string }) {
	const all: Crumb[] = [{ label: "Home", href: "/" }, ...items];
	const last = all.length - 1;
	const structured = all.map((c, i) => ({
		label: c.label,
		path: c.href ?? (i === last && c.current !== false ? path : undefined),
	}));
	return (
		<nav aria-label="Breadcrumb" className="text-sm text-muted">
			<JsonLd data={breadcrumbJsonLd(structured)} />
			<ol className="flex flex-wrap gap-2">
				{all.map((c, i) => {
					const current = i === last && !c.href && c.current !== false;
					return (
						<li key={i} className="flex gap-2">
							{c.href ? (
								<Link href={c.href}>{c.label}</Link>
							) : (
								<span className={current ? "font-medium text-text" : undefined} aria-current={current ? "page" : undefined}>
									{c.label}
								</span>
							)}
							{i !== last && <span aria-hidden="true">›</span>}
						</li>
					);
				})}
			</ol>
		</nav>
	);
}
