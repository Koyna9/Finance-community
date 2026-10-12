import Breadcrumbs from "@/components/Breadcrumbs";
import SidebarBox, { PillLinks } from "@/components/SidebarBox";

// Layout for plain text pages (About, How we source jobs; later Privacy, Terms): the list pages'
// white top band (breadcrumbs, H1, intro), then text cards with a small "Browse jobs" sidebar.
export default function InfoPage({
	path,
	crumb,
	title,
	intro,
	children,
}: {
	path: string;
	crumb: string;
	title: string;
	intro: string;
	children: React.ReactNode;
}) {
	return (
		<>
			<section className="border-b border-border bg-surface">
				<div className="mx-auto flex max-w-[1200px] flex-col gap-3.5 px-6 pb-[30px] pt-[22px]">
					<Breadcrumbs items={[{ label: crumb }]} path={path} />
					<h1 className="text-[30px] font-bold leading-[1.15] tracking-[-0.02em] sm:text-[38px]">{title}</h1>
					<p className="max-w-[720px] text-[17px] leading-normal text-text-2">{intro}</p>
				</div>
			</section>
			<main className="mx-auto flex max-w-[1200px] flex-wrap items-start gap-8 px-6 pb-16 pt-8">
				<article className="flex min-w-0 flex-[999_1_560px] flex-col gap-5">{children}</article>
				<aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-5">
					<SidebarBox id="browse" title="Browse jobs">
						<PillLinks
							links={[
								{ href: "/finance-jobs", label: "All finance jobs" },
								{ href: "/locations", label: "Jobs by location" },
								{ href: "/titles", label: "Jobs by title" },
								{ href: "/companies", label: "Companies hiring" },
								{ href: "/salaries", label: "Finance salaries" },
							]}
						/>
					</SidebarBox>
				</aside>
			</main>
		</>
	);
}

// One white text card with an H2 (same look as the job page's cards).
export function InfoSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
	return (
		<section aria-labelledby={id} className="flex flex-col gap-3 rounded-[10px] border border-border bg-surface p-6">
			<h2 id={id} className="text-xl font-bold">
				{title}
			</h2>
			<div className="flex flex-col gap-3 text-base leading-[1.65] text-text-body">{children}</div>
		</section>
	);
}
