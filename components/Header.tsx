import Link from "next/link";
import LogoMark from "@/components/LogoMark";
import NavLinks from "@/components/NavLinks";
import { SITE_NAME } from "@/lib/site";

// White bar: logo mark + site name on the left, main nav on the right (DESIGN.md section 4).
export default function Header() {
	return (
		<header className="border-b border-border bg-surface">
			<div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-4 gap-y-1 px-6 py-3.5">
				<Link href="/" className="flex items-center gap-2.5 text-ink hover:text-ink hover:no-underline">
					<LogoMark />
					<span className="text-xl font-bold tracking-[-0.01em]">{SITE_NAME}</span>
				</Link>
				<NavLinks />
			</div>
		</header>
	);
}
