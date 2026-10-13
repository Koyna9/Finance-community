// Small grey label (13px; 14px on the job page). icon="pin" adds a map-pin for locations.
export default function Chip({
	children,
	icon,
	large = false,
}: {
	children: React.ReactNode;
	icon?: "pin";
	large?: boolean;
}) {
	const size = large ? "px-2.5 py-1.5 text-sm" : "px-[9px] py-[5px] text-[13px]";
	return (
		<span className={`inline-flex items-center gap-[5px] rounded-md bg-chip leading-snug text-text-2 ${size}`}>
			{icon === "pin" && (
				<svg
					width={large ? 15 : 14}
					height={large ? 15 : 14}
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
					<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
					<circle cx="12" cy="9.5" r="2.5" />
				</svg>
			)}
			{children}
		</span>
	);
}
