import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import ListFilter from "@/components/ListFilter";

export type AzItem = { href: string; label: string; count: number };

// A–Z index page (/titles, /companies): white top band, letter jump links, then each letter's
// links with their open-job counts in columns. The filter box (below the letters) only hides
// items in the browser; the full list is always in the HTML.
export default function AzIndex({
	title,
	intro,
	crumb,
	path,
	items,
	filter,
}: {
	title: string;
	intro: string;
	crumb: string;
	path: string;
	items: AzItem[];
	filter: { label: string; placeholder: string; noun: [string, string] };
}) {
	const groups = new Map<string, AzItem[]>();
	for (const item of [...items].sort((a, b) => a.label.localeCompare(b.label, "en", { sensitivity: "base" }))) {
		const first = item.label[0]?.toUpperCase() ?? "#";
		const letter = /[A-Z]/.test(first) ? first : "#";
		groups.set(letter, [...(groups.get(letter) ?? []), item]);
	}
	const id = (letter: string) => `letter-${letter === "#" ? "0" : letter}`;

	return (
		<>
			<section className="border-b border-border bg-surface">
				<div className="mx-auto flex max-w-[1200px] flex-col gap-3.5 px-6 pb-[30px] pt-[22px]">
					<Breadcrumbs items={[{ label: crumb }]} path={path} />
					<h1 className="text-[30px] font-bold leading-[1.15] tracking-[-0.02em] sm:text-[38px]">{title}</h1>
					<p className="max-w-[720px] text-[17px] leading-normal text-text-2">{intro}</p>
					{groups.size > 1 && (
						<nav aria-label="Jump to letter" className="mt-1.5 flex flex-wrap gap-2">
							{[...groups.keys()].map((letter) => (
								<a
									key={letter}
									href={`#${id(letter)}`}
									className="flex h-11 w-11 items-center justify-center rounded-lg border border-border-strong bg-surface font-mono text-[15px] font-semibold"
								>
									{letter}
								</a>
							))}
						</nav>
					)}
					{items.length > 0 && <ListFilter target="az-list" {...filter} />}
				</div>
			</section>

			<main id="az-list" className="mx-auto flex max-w-[1200px] flex-col gap-8 px-6 pb-16 pt-8">
				{items.length === 0 ? (
					<p className="rounded-[10px] border border-border bg-surface p-5 text-text-2">No open jobs here yet.</p>
				) : (
					[...groups.entries()].map(([letter, list]) => (
						<section
							key={letter}
							id={id(letter)}
							aria-label={letter}
							data-filter-section
							className="flex scroll-mt-6 flex-col gap-3"
						>
							<div className="flex items-center gap-3">
								<span className="font-mono text-[22px] font-semibold text-accent-text">{letter}</span>
								<span className="h-px flex-1 bg-border" />
							</div>
							<ul className="columns-1 gap-8 rounded-[10px] border border-border bg-surface px-5 py-2 sm:columns-2 lg:columns-3">
								{list.map((item) => (
									<li
										key={item.href}
										data-filter-item
										data-filter-text={item.label}
										className="break-inside-avoid border-b border-border-soft last:border-b-0"
									>
										<Link href={item.href} className="flex justify-between gap-3 py-2.5 text-[15px]">
											<span className="min-w-0">{item.label}</span>
											<span className="font-mono text-muted">{item.count}</span>
										</Link>
									</li>
								))}
							</ul>
						</section>
					))
				)}
			</main>
		</>
	);
}
