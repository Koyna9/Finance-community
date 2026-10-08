// Navy "Apply on company site" button. Opens the employer's listing in a new tab.
export default function ApplyButton({ href, fullWidth = false }: { href: string; fullWidth?: boolean }) {
	return (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			className={`${fullWidth ? "flex w-full" : "inline-flex self-start"} min-h-12 items-center justify-center gap-2 rounded-lg bg-ink px-5 py-3.5 text-base font-semibold text-white hover:bg-ink/90 hover:text-white hover:no-underline`}
		>
			Apply on company site
			<svg
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<path d="M7 17L17 7" />
				<path d="M8 7h9v9" />
			</svg>
			<span className="sr-only">(opens in a new tab)</span>
		</a>
	);
}
