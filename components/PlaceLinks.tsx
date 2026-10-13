import Link from "next/link";
import SidebarBox, { LinkGrid, LinkList, PillLinks, type SidebarLink } from "@/components/SidebarBox";

// Internal-link box on list pages ("FP&A jobs by state", "Other finance jobs in Texas", ...).
// Only pass links to pages that pass the thin-page rule. Nothing is shown when there are no links.
// list: rows with counts · pills: rounded links · grid: 2-column plain links.
export default function PlaceLinks({
	id,
	title,
	links,
	variant = "list",
	more,
}: {
	id: string;
	title: string;
	links: SidebarLink[];
	variant?: "list" | "pills" | "grid";
	more?: { href: string; label: string };
}) {
	if (links.length === 0) return null;
	return (
		<SidebarBox id={id} title={title}>
			{variant === "list" && <LinkList links={links} />}
			{variant === "pills" && <PillLinks links={links} />}
			{variant === "grid" && <LinkGrid links={links} />}
			{more && (
				<Link href={more.href} className="mt-3 inline-block text-sm font-semibold text-accent-text">
					{more.label} →
				</Link>
			)}
		</SidebarBox>
	);
}
