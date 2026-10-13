import { MIN_PAY_LISTINGS } from "@/components/PayStrip";
import { getPayStats } from "@/lib/db";
import { CATEGORY_LIST, shortUsd } from "@/lib/format";
import { OG_SIZE, OG_TYPE, ogCard } from "@/lib/og";

// Share picture of a salary page: the role's US median, low and high (same figures as the page).
// Rendered on request (it reads the database; nothing at build time).
export const dynamic = "force-dynamic";
export const alt = "Finance salaries in the US: median, low and high yearly pay";
export const size = OG_SIZE;
export const contentType = OG_TYPE;

export default async function Image({ params }: { params: Promise<{ category: string }> }) {
	const key = (await params).category;
	const cat = CATEGORY_LIST.find((c) => c.key === key);
	const pay = cat ? await getPayStats({ category: cat.key }) : null;
	if (!cat || !pay || pay.withPay < MIN_PAY_LISTINGS) {
		return ogCard({ eyebrow: "US finance salaries", title: "Finance pay from listings where the employer states it." });
	}
	return ogCard({
		eyebrow: `Salaries · from ${pay.withPay} full-time listings that state pay`,
		title: `${cat.label} Salaries in the US`,
		subtitle: `Low ${shortUsd(pay.low)} · High ${shortUsd(pay.high)} · stated by employers, never estimated`,
		highlight: `Median ${shortUsd(pay.median)}`,
		footer: "Yearly pay, full-time listings",
	});
}
