import Link from "next/link";

// 404 content, shared by app/(frontend)/not-found.tsx and app/global-not-found.tsx.
export default function NotFoundContent() {
	return (
		<main className="mx-auto flex max-w-[1200px] flex-col items-start gap-4 px-6 py-20">
			<p className="font-mono text-[13px] uppercase tracking-[0.08em] text-muted">404</p>
			<h1 className="text-[28px] font-bold tracking-[-0.02em] sm:text-4xl">We couldn&apos;t find that page</h1>
			<p className="max-w-[560px] text-base leading-normal text-text-2">
				The job or page may have been removed, or the link may be mistyped.
			</p>
			<div className="mt-2 flex flex-wrap gap-3">
				<Link
					href="/finance-jobs"
					className="rounded-lg bg-ink px-[18px] py-3 text-[15px] font-semibold text-white hover:bg-ink/90 hover:text-white hover:no-underline"
				>
					Browse all finance jobs
				</Link>
				<Link
					href="/"
					className="rounded-lg border border-border-strong bg-surface px-[18px] py-3 text-[15px] font-semibold text-ink"
				>
					Go to the home page
				</Link>
			</div>
		</main>
	);
}
