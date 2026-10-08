import { payShort } from "@/lib/format";

// "$165K–$195K" in green on the tint, or "Pay not stated" in grey.
export default function PayChip({ min, max }: { min: number | null; max: number | null }) {
	const pay = payShort(min, max);
	const colours = pay ? "bg-accent-tint text-accent-text" : "bg-chip text-muted";
	return (
		<span className={`rounded-md px-[9px] py-[5px] font-mono text-[13px] font-semibold leading-snug ${colours}`}>
			{pay ?? "Pay not stated"}
		</span>
	);
}
