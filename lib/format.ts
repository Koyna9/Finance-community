// Formatting helpers: pay (USD), "3d ago" dates, and labels for categories, levels and places.

import { CATEGORIES } from "@/shared/rules.js";
import { stateCode } from "@/shared/states.js";

// ---- Categories ------------------------------------------------------------------------------

export type CategoryInfo = {
	key: string;
	label: string; // "Investment & Corporate Development"
	shortLabel: string; // "Investment & Corp Dev" (cards, chips)
	hint: string; // one line for the home page cards
	path: string; // "/investment-jobs"
};

// path: only when the URL is not /<key>-jobs (CLAUDE.md section 8).
const CATEGORY_EXTRA: Record<string, { shortLabel?: string; hint: string; path?: string }> = {
	leadership: { hint: "CFO, VP and head of finance", path: "/finance-leadership-jobs" },
	tax: { hint: "Tax accountants, specialists, managers" },
	audit: { hint: "Internal, external and IT audit" },
	treasury: { hint: "Cash management, liquidity" },
	"risk-compliance": { hint: "Risk, compliance, AML, KYC" },
	investment: { shortLabel: "Investment & Corp Dev", hint: "M&A, valuation, investment accounting" },
	fpa: { hint: "Financial analysts, planning, business finance" },
	accounting: { hint: "Staff accountants, AP/AR, controllers" },
};

// Same order as shared/rules.js.
export const CATEGORY_LIST: CategoryInfo[] = CATEGORIES.map((c: { key: string; label: string }) => ({
	key: c.key,
	label: c.label,
	shortLabel: CATEGORY_EXTRA[c.key]?.shortLabel ?? c.label,
	hint: CATEGORY_EXTRA[c.key]?.hint ?? "",
	path: CATEGORY_EXTRA[c.key]?.path ?? `/${c.key}-jobs`,
}));

export function categoryInfo(key: string | null): CategoryInfo | undefined {
	return CATEGORY_LIST.find((c) => c.key === key);
}

// ---- Levels ----------------------------------------------------------------------------------

export const LEVELS = ["entry", "mid", "senior", "lead"] as const;

const LEVEL_SHORT: Record<string, string> = { entry: "Entry", mid: "Mid", senior: "Senior", lead: "Lead" };

export function levelLabel(level: string | null, long = false): string {
	const short = LEVEL_SHORT[level ?? ""] ?? "";
	return long && short ? `${short} level` : short;
}

export function levelPath(level: string): string {
	return `/${level}-level-finance-jobs`;
}

// ---- Places ----------------------------------------------------------------------------------

type PlaceFields = { city: string | null; state: string | null; is_remote: number };

// "Austin, TX" (city + state code), or the state name alone.
export function cityStateLabel(city: string | null, state: string): string {
	return city ? `${city}, ${stateCode(state) ?? state}` : state;
}

// "Austin, TX", "Texas", "Remote (US)" or "United States".
export function placeLabel(job: PlaceFields): string {
	if (job.state) return cityStateLabel(job.city, job.state);
	if (job.is_remote) return "Remote (US)";
	return "United States";
}

// ai_work_arrangement values -> chip text.
const WORK_STYLE: Record<string, string> = {
	"On-site": "On-site",
	Hybrid: "Hybrid",
	"Remote OK": "Remote-friendly",
	"Remote Solely": "Remote",
};

export function workStyleLabel(value: string | null): string | null {
	return value ? (WORK_STYLE[value] ?? value) : null;
}

// employmentType values (Google's) -> chip text. "OTHER" is not shown (and not in JobPosting).
export const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
	FULL_TIME: "Full-time",
	PART_TIME: "Part-time",
	CONTRACTOR: "Contract",
	TEMPORARY: "Temporary",
	INTERN: "Internship",
};

// The job's employment types we show and mark up, e.g. ["INTERN", "FULL_TIME"].
export function shownEmploymentTypes(values: string[]): string[] {
	return values.filter((v) => v in EMPLOYMENT_TYPE_LABELS);
}

// "Full-time", "Internship · Full-time", or null when unknown.
export function employmentTypeLabel(values: string[]): string | null {
	const shown = shownEmploymentTypes(values).map((v) => EMPLOYMENT_TYPE_LABELS[v]);
	return shown.length ? shown.join(" · ") : null;
}

// ---- Pay -------------------------------------------------------------------------------------

// $165K, $82K, $1.2M
export function shortUsd(n: number): string {
	if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
	if (n >= 1000) return `$${Math.round(n / 1000)}K`;
	return `$${n}`;
}

// $120,000
function fullUsd(n: number): string {
	return `$${n.toLocaleString("en-US")}`;
}

function payRange(min: number | null, max: number | null, fmt: (n: number) => string): string | null {
	if (min && max) return min === max ? fmt(min) : `${fmt(min)}–${fmt(max)}`;
	if (min) return `From ${fmt(min)}`;
	if (max) return `Up to ${fmt(max)}`;
	return null;
}

// "$165K–$195K", or null when the employer did not state pay.
export function payShort(min: number | null, max: number | null): string | null {
	return payRange(min, max, shortUsd);
}

// "$120,000–$140,000", or null when the employer did not state pay.
export function payFull(min: number | null, max: number | null): string | null {
	return payRange(min, max, fullUsd);
}

// ---- Dates -----------------------------------------------------------------------------------

// date_posted arrives without a time zone ("2026-10-07T02:48:51"); it is UTC.
function postedDate(datePosted: string): Date {
	return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(datePosted) ? datePosted : `${datePosted}Z`);
}

function ageParts(datePosted: string | null, now = Date.now()) {
	if (!datePosted) return null;
	const ms = now - postedDate(datePosted).getTime();
	if (Number.isNaN(ms)) return null;
	const hours = Math.max(0, Math.floor(ms / 3_600_000));
	if (hours < 1) return { n: 0, unit: "now" as const };
	if (hours < 24) return { n: hours, unit: "hour" as const };
	const days = Math.floor(hours / 24);
	if (days < 30) return { n: days, unit: "day" as const };
	return { n: Math.floor(days / 30), unit: "month" as const };
}

// "2h ago", "3d ago", "1mo ago"
export function timeAgoShort(datePosted: string | null): string | null {
	const a = ageParts(datePosted);
	if (!a) return null;
	if (a.unit === "now") return "just now";
	return `${a.n}${{ hour: "h", day: "d", month: "mo" }[a.unit]} ago`;
}

// "2 hours ago", "1 day ago"
export function timeAgoLong(datePosted: string | null): string | null {
	const a = ageParts(datePosted);
	if (!a) return null;
	if (a.unit === "now") return "just now";
	return `${a.n} ${a.unit}${a.n === 1 ? "" : "s"} ago`;
}

// ---- Text ------------------------------------------------------------------------------------

// ["Houston", "Austin", "Dallas"] -> "Houston, Austin and Dallas"
export function joinAnd(items: string[]): string {
	if (items.length <= 1) return items.join("");
	return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

// "Children's Law Center" -> "CL"; "Stripe" -> "ST"
export function initials(name: string | null): string {
	const words = String(name ?? "")
		.replace(/[^\p{L}\p{N}\s]/gu, " ")
		.split(/\s+/)
		.filter((w) => w && !/^(the|of|and)$/i.test(w));
	if (words.length === 0) return "?";
	if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
	return (words[0][0] + words[1][0]).toUpperCase();
}

// First sentence of the summary, at most ~160 characters (list-page job cards).
export function blurb(summary: string | null, max = 160): string | null {
	if (!summary) return null;
	const first = summary.trim().split(/(?<=[.!?])\s+/)[0];
	if (first.length <= max) return first;
	return first.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

// Requirements arrive as one paragraph; show them as a list of sentences.
export function sentences(text: string | null): string[] {
	if (!text) return [];
	return text
		.trim()
		.split(/(?<=[.!?])\s+(?=[A-Z0-9"“(])/)
		.map((s) => s.trim())
		.filter(Boolean);
}

// Description paragraphs: split at blank lines, keep single line breaks inside a paragraph.
export function paragraphs(text: string | null): string[] {
	if (!text) return [];
	return text
		.replace(/\r\n/g, "\n")
		.split(/\n\s*\n/)
		.map((p) => p.trim())
		.filter(Boolean);
}
