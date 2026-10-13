// 32px navy square with three bars: two white, the tallest in the accent colour.
export default function LogoMark() {
	return (
		<span
			aria-hidden="true"
			className="flex h-8 w-8 shrink-0 items-end justify-center gap-[3px] rounded-[7px] bg-ink pb-[7px]"
		>
			<span className="h-2 w-1 rounded-[1px] bg-white" />
			<span className="h-[13px] w-1 rounded-[1px] bg-white" />
			<span className="h-[18px] w-1 rounded-[1px] bg-accent" />
		</span>
	);
}
