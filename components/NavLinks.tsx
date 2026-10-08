"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
	{ href: "/finance-jobs", label: "Finance jobs" },
	{ href: "/locations", label: "Locations" },
	{ href: "/salaries", label: "Salaries" },
];

// Which nav item is active: list pages (/finance-jobs, /fpa-jobs/texas, /entry-level-finance-jobs)
// count as "Finance jobs".
function isActive(pathname: string, href: string): boolean {
	if (href === "/finance-jobs") return /^\/[a-z-]+-jobs(\/|$)/.test(pathname);
	return pathname === href || pathname.startsWith(`${href}/`);
}

// Hover: soft chip background + a thin accent bar that grows from the left.
// The active item keeps the bar shown.
export default function NavLinks() {
	const pathname = usePathname();
	return (
		<nav aria-label="Main" className="-mx-3.5 flex flex-wrap gap-1.5 sm:mx-0">
			{LINKS.map((l) => {
				const active = isActive(pathname, l.href);
				return (
					<Link
						key={l.href}
						href={l.href}
						aria-current={active ? "page" : undefined}
						className={`relative rounded-lg px-3.5 py-3 text-[15px] transition-colors duration-150 hover:bg-chip hover:no-underline after:absolute after:inset-x-3.5 after:bottom-1.5 after:h-0.5 after:origin-left after:rounded-full after:bg-accent after:transition-transform after:duration-200 hover:after:scale-x-100 motion-reduce:after:transition-none ${
							active
								? "font-semibold text-accent-text after:scale-x-100 hover:text-accent-text"
								: "font-medium after:scale-x-0 hover:text-ink"
						}`}
					>
						{l.label}
					</Link>
				);
			})}
		</nav>
	);
}
