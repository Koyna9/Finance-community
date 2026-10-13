import Link from "next/link";

// White sidebar card with an H2 (DESIGN.md section 4), plus its three content variants below.
export default function SidebarBox({
	title,
	id,
	children,
}: {
	title: string;
	id: string;
	children: React.ReactNode;
}) {
	return (
		<section aria-labelledby={id} className="rounded-[10px] border border-border bg-surface p-5">
			<h2 id={id} className="mb-3 text-[17px] font-bold">
				{title}
			</h2>
			{children}
		</section>
	);
}

export type SidebarLink = { href: string; label: string; count?: number };

// Rows divided by thin lines, count on the right in Plex Mono.
export function LinkList({ links }: { links: SidebarLink[] }) {
	return (
		<ul>
			{links.map((l) => (
				<li key={l.href} className="border-t border-border-soft">
					<Link href={l.href} className="flex justify-between gap-3 py-2.5 text-[15px]">
						<span>{l.label}</span>
						{l.count !== undefined && <span className="font-mono text-muted">{l.count}</span>}
					</Link>
				</li>
			))}
		</ul>
	);
}

// Rounded pill links.
export function PillLinks({ links }: { links: SidebarLink[] }) {
	return (
		<div className="flex flex-wrap gap-2">
			{links.map((l) => (
				<Link
					key={l.href}
					href={l.href}
					className="rounded-full border border-border-strong px-3 py-[9px] text-sm leading-snug"
				>
					{l.label}
				</Link>
			))}
		</div>
	);
}

// Two-column grid of plain links.
export function LinkGrid({ links }: { links: SidebarLink[] }) {
	return (
		<ul className="grid grid-cols-2 gap-x-4 gap-y-1">
			{links.map((l) => (
				<li key={l.href}>
					<Link href={l.href} className="block py-2 text-[15px]">
						{l.label}
					</Link>
				</li>
			))}
		</ul>
	);
}
