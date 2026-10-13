import SidebarBox from "@/components/SidebarBox";

// "How these figures work" box on the salary pages.
export default function PayMethod() {
	return (
		<SidebarBox id="method" title="How these figures work">
			<ul className="flex list-disc flex-col gap-2 pl-5 text-sm leading-normal text-text-2">
				<li>Only open listings where the employer states pay in US dollars. We never estimate pay.</li>
				<li>Hourly, weekly and monthly pay is converted to a yearly figure (hourly pay × 2,080 hours, a full-time year).</li>
				<li>Part-time, contract, temporary and internship listings are left out: their pay isn&apos;t comparable to a full-time salary.</li>
				<li>Low is the lowest stated figure, high the highest; the median uses the middle of each listing&apos;s range.</li>
				<li>A figure is shown only when 5 or more listings state pay.</li>
			</ul>
		</SidebarBox>
	);
}
