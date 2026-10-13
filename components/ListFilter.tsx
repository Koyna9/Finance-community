"use client";

import { useId, useState } from "react";

// "Filter this list" box for the index pages (/locations, /titles, /companies). Browser-only:
// the full list is always in the server HTML (what Google sees); typing only hides non-matching
// items with the `hidden` attribute. No new URLs, no query strings (agreed 2026-10-08).
//
// Markup it works on, inside the element with id `target`:
//   data-filter-item + data-filter-text   one entry (a company, a title, a state card)
//   data-filter-subitem + data-filter-text  an entry inside an item (a city in a state card)
//   data-filter-section                    a group (letter) that hides when none of its items show
// Anywhere on the page: data-filter-hide = hide while searching (e.g. "Where the jobs are").

function normalize(text: string): string {
	return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

function applyFilter(targetId: string, query: string): number {
	const root = document.getElementById(targetId);
	if (!root) return 0;
	const q = normalize(query);
	let shown = 0;
	root.querySelectorAll<HTMLElement>("[data-filter-item]").forEach((item) => {
		const selfMatch = !q || normalize(item.dataset.filterText ?? "").includes(q);
		let subMatch = false;
		item.querySelectorAll<HTMLElement>("[data-filter-subitem]").forEach((sub) => {
			const match = selfMatch || normalize(sub.dataset.filterText ?? "").includes(q);
			sub.hidden = !match;
			if (match && !selfMatch) subMatch = true;
		});
		item.hidden = !(selfMatch || subMatch);
		if (!item.hidden) shown++;
	});
	root.querySelectorAll<HTMLElement>("[data-filter-section]").forEach((section) => {
		section.hidden = !section.querySelector("[data-filter-item]:not([hidden])");
	});
	document.querySelectorAll<HTMLElement>("[data-filter-hide]").forEach((el) => {
		el.hidden = q !== "";
	});
	return shown;
}

export default function ListFilter({
	target,
	label,
	placeholder,
	noun,
}: {
	target: string;
	label: string; // "Search companies"
	placeholder: string;
	noun: [string, string]; // ["company", "companies"]
}) {
	const id = useId();
	const [query, setQuery] = useState("");
	const [shown, setShown] = useState<number | null>(null);

	function update(value: string) {
		setQuery(value);
		const n = applyFilter(target, value);
		setShown(value.trim() ? n : null);
	}

	return (
		<div role="search" className="flex w-full max-w-[560px] flex-col gap-2">
			<label htmlFor={id} className="sr-only">
				{label}
			</label>
			<div className="relative">
				<svg
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
					className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
				>
					<circle cx="11" cy="11" r="7" />
					<path d="m20 20-4-4" />
				</svg>
				<input
					id={id}
					type="search"
					value={query}
					onChange={(e) => update(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Escape") update("");
					}}
					placeholder={placeholder}
					autoComplete="off"
					spellCheck={false}
					className="h-12 w-full rounded-lg border border-border-strong bg-surface pl-11 pr-4 text-base text-text placeholder:text-muted transition-colors duration-150 hover:border-muted focus:border-accent-text focus:outline-2 focus:outline-offset-2 focus:outline-ink"
				/>
			</div>
			<p aria-live="polite" className="min-h-5 text-sm text-muted">
				{shown === null
					? ""
					: shown === 0
						? `No matches for “${query.trim()}”.`
						: shown === 1
							? `1 ${noun[0]} matches “${query.trim()}”.`
							: `${shown} ${noun[1]} match “${query.trim()}”.`}
			</p>
		</div>
	);
}
