import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

// Share-preview pictures (Open Graph, 1200×630) for LinkedIn, Slack, X, ... (SEO audit 2026-10-12,
// 3.7). One card design in the site's colours (design/DESIGN.md: navy hero, green accent); only real
// data from the page, nothing invented. Used by the opengraph-image files.

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_TYPE = "image/png";

// Design tokens (app/globals.css), as hex: the image renderer can't read CSS variables.
const INK = "#0B2545";
const ACCENT = "#2E9E77";
const EYEBROW = "#9FD3BE";
const BODY = "#D5DEE8";

export function ogCard({
	eyebrow,
	title,
	subtitle,
	highlight,
	footer = "Apply on the employer's own site",
}: {
	eyebrow: string;
	title: string;
	subtitle?: string | null;
	highlight?: string | null; // e.g. the stated pay, shown in a green pill
	footer?: string;
}): ImageResponse {
	const titleSize = title.length > 70 ? 48 : title.length > 40 ? 58 : 68;
	return new ImageResponse(
		(
			<div
				style={{
					width: "100%",
					height: "100%",
					display: "flex",
					flexDirection: "column",
					justifyContent: "space-between",
					background: INK,
					color: "white",
					padding: "64px 72px",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: 18 }}>
					{/* Logo mark: three bars, the tallest in the accent colour (as in favicon.svg) */}
					<div
						style={{
							display: "flex",
							alignItems: "flex-end",
							gap: 6,
							width: 56,
							height: 56,
							padding: "12px 12px",
							borderRadius: 12,
							border: "2px solid rgba(255,255,255,0.25)",
						}}
					>
						<div style={{ width: 8, height: 14, background: "white", borderRadius: 2 }} />
						<div style={{ width: 8, height: 22, background: "white", borderRadius: 2 }} />
						<div style={{ width: 8, height: 30, background: ACCENT, borderRadius: 2 }} />
					</div>
					<div style={{ fontSize: 34, fontWeight: 700 }}>{SITE_NAME}</div>
				</div>

				<div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
					<div style={{ fontSize: 26, letterSpacing: 2, textTransform: "uppercase", color: EYEBROW }}>{eyebrow}</div>
					<div style={{ fontSize: titleSize, fontWeight: 700, lineHeight: 1.12 }}>{title}</div>
					{subtitle && <div style={{ fontSize: 32, color: BODY }}>{subtitle}</div>}
				</div>

				<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
					{highlight ? (
						<div style={{ display: "flex", background: ACCENT, borderRadius: 12, padding: "12px 24px", fontSize: 34, fontWeight: 700 }}>
							{highlight}
						</div>
					) : (
						<div style={{ display: "flex" }} />
					)}
					<div style={{ fontSize: 24, color: BODY }}>{footer}</div>
				</div>
			</div>
		),
		OG_SIZE,
	);
}
