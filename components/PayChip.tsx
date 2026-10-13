import { jobPayShort, type PayFields } from "@/lib/format";

// "$165K–$195K" or "$25–$32/hr" (as the employer states it) in green on the tint, or "Pay not stated" in grey.
export default function PayChip({ pay: fields }: { pay: PayFields }) {
	const pay = jobPayShort(fields);
	const colours = pay ? "bg-accent-tint text-accent-text" : "bg-chip text-muted";
	return (
		<span className={`rounded-md px-[9px] py-[5px] font-mono text-[13px] font-semibold leading-snug ${colours}`}>
			{pay ?? "Pay not stated"}
		</span>
	);
}
