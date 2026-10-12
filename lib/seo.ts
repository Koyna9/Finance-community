// Page titles and meta descriptions (CLAUDE.md section 9).
// The root layout adds " — <SITE_NAME>" to every title (except the home page's absolute title).

import type { Job, PayStats } from "@/lib/db";
import {
	categoryInfo,
	jobPayForMarkup,
	jobPayFull,
	joinAnd,
	paragraphs,
	placeLabel,
	shortUsd,
	shownEmploymentTypes,
} from "@/lib/format";
import { stateCode } from "@/shared/states.js";
import { SITE_DESCRIPTION, SITE_NAME, siteUrl } from "@/lib/site";

const DESCRIPTION_MAX = 160;

function trimTo(text: string, max = DESCRIPTION_MAX): string {
	if (text.length <= max) return text;
	return text.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

// "1 FP&A Job", "2 FP&A Jobs" (also for lowercase "jobs").
function countJobs(count: number, what: string): string {
	return `${count} ${count === 1 ? what.replace(/\b(J|j)obs\b/, "$1ob") : what}`;
}

// ---- Canonical URLs (SEO rule 1) -------------------------------------------------------------

// Absolute, lowercase, no trailing slash, no query string, except page 2+ of a list
// ("/fpa-jobs?page=2"), which is canonical to itself.
export function canonicalUrl(path: string, page = 1): string {
	const clean = path.toLowerCase().replace(/\/+$/, "");
	return `${siteUrl()}${clean}${page > 1 ? `?page=${page}` : ""}`;
}

// " — Page 2" for page 2+, added to list-page titles.
export function pageSuffix(page: number): string {
	return page > 1 ? ` — Page ${page}` : "";
}

// ---- Structured data (SEO rule 3) ------------------------------------------------------------

// BreadcrumbList JSON-LD from the visible breadcrumbs. Items without a URL are left out.
export function breadcrumbJsonLd(items: { label: string; path?: string }[]) {
	const linked = items.filter((c): c is { label: string; path: string } => Boolean(c.path));
	return {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: linked.map((c, i) => ({
			"@type": "ListItem",
			position: i + 1,
			name: c.label,
			item: canonicalUrl(c.path),
		})),
	};
}

// ---- Home ------------------------------------------------------------------------------------

export function homeTitle(): string {
	return `${SITE_NAME} — US Finance Jobs from Employers' Own Hiring Pages`;
}

// WebSite + Organization structured data for the home page (SEO audit 2026-10-12, 4.6): tells Google
// the site's name and logo. No SearchAction: the site has no search box.
export function homeJsonLd() {
	const url = canonicalUrl("/");
	const organization = { "@id": `${url}/#organization` };
	return {
		"@context": "https://schema.org",
		"@graph": [
			{ "@type": "WebSite", "@id": `${url}/#website`, name: SITE_NAME, url, description: SITE_DESCRIPTION, publisher: organization },
			{ "@type": "Organization", ...organization, name: SITE_NAME, url, logo: `${url}/logo.png` },
		],
	};
}

export function homeDescription(openJobs: number): string {
	return trimTo(
		`Browse ${openJobs} open finance jobs at US companies: accounting, FP&A, tax, audit and more, ` +
			`by role, level, state and city. Apply directly on the employer's site.`,
	);
}

// ---- List pages (Day 4) ----------------------------------------------------------------------

// "37 FP&A Jobs in Austin, TX" / "104 Finance Jobs in the US"
// what: "FP&A Jobs", "Finance Jobs", "Entry Level Finance Jobs"; place: "Austin, TX" or null (US).
export function listTitle(count: number, what: string, place: string | null): string {
	return `${countJobs(count, what)} ${place ? `in ${place}` : "in the US"}`;
}

// "Browse 37 open FP&A jobs in Austin, Texas from companies hiring now. Pay range $85K–$130K."
// what: "FP&A jobs", "finance jobs"; placeLong: "Austin, Texas" or null (US).
export function listDescription(count: number, what: string, placeLong: string | null, pay: PayStats | null): string {
	const where = placeLong ? `in ${placeLong}` : "across the US";
	const payText = pay && pay.withPay >= 5 ? ` Pay range ${shortUsd(pay.low)}–${shortUsd(pay.high)}.` : "";
	return trimTo(`Browse ${count} open ${countJobs(count, what).replace(/^\d+ /, "")} ${where} from companies hiring now.${payText}`);
}

// Default intro under the H1 (when the admin has not written one):
// "7 open FP&A jobs in Texas, including Houston, Austin and Dallas. All from employers' own hiring
// pages, updated every night."
export function listIntro(count: number, what: string, placeLong: string | null, topPlaces: string[]): string {
	const where = placeLong ? ` in ${placeLong}` : " across the US";
	const including = topPlaces.length > 1 ? `, including ${joinAnd(topPlaces)}` : "";
	return `${countJobs(count, `open ${what}`)}${where}${including}. All from employers' own hiring pages, updated every night.`;
}

// ---- Company pages ---------------------------------------------------------------------------

// "5 Finance Jobs at Stripe"
export function companyTitle(count: number, company: string): string {
	return `${countJobs(count, "Finance Jobs")} at ${company}`;
}

// "Browse 5 open finance jobs at Stripe (Financial Services). Apply on Stripe's own careers site. Pay range …"
export function companyDescription(count: number, company: string, industry: string | null, pay: PayStats | null): string {
	const payText = pay && pay.withPay >= 5 ? ` Pay range ${shortUsd(pay.low)}–${shortUsd(pay.high)}.` : "";
	const about = industry ? ` (${industry})` : "";
	return trimTo(
		`Browse ${countJobs(count, "open finance jobs")} at ${company}${about}. Apply on the company's own careers site.${payText}`,
	);
}

// "Stripe has 5 open finance jobs, including roles in Texas and California. All from the company's
// own hiring pages, updated every night."
export function companyIntro(count: number, company: string, topPlaces: string[]): string {
	const where =
		topPlaces.length > 1 ? `, including roles in ${joinAnd(topPlaces)}` : topPlaces.length === 1 ? ` in ${topPlaces[0]}` : "";
	return `${company} has ${countJobs(count, "open finance jobs")}${where}. All from the company's own hiring pages, updated every night.`;
}

// ---- Salary pages ----------------------------------------------------------------------------

// "FP&A Salaries in the US: Median $101K"
export function salaryTitle(what: string, pay: PayStats): string {
	return `${what} Salaries in the US: Median ${shortUsd(pay.median)}`;
}

// "Yearly FP&A pay in the US from 9 full-time listings that state pay: low $82K, median $101K, high $309K."
export function salaryDescription(what: string, pay: PayStats, extra = ""): string {
	return trimTo(
		`Yearly ${what} pay in the US from ${pay.withPay} full-time listings that state pay: low ${shortUsd(pay.low)}, ` +
			`median ${shortUsd(pay.median)}, high ${shortUsd(pay.high)}.${extra}`,
	);
}

// ---- Job page --------------------------------------------------------------------------------

// "FP&A Manager at Ridgeway Semiconductors, Austin, TX"
export function jobTitle(job: Job): string {
	const at = job.company ? ` at ${job.company}` : "";
	return `${job.clean_title}${at}, ${placeLabel(job)}`;
}

// "FP&A Manager at Ridgeway Semiconductors in Austin, TX. Pay $120,000–$140,000 a year. <summary>"
// Pay as the employer states it ("Pay $25–$32 an hour.").
export function jobDescription(job: Job): string {
	const at = job.company ? ` at ${job.company}` : "";
	const pay = jobPayFull(job);
	const parts = [
		`${job.clean_title}${at} in ${placeLabel(job)}.`,
		job.status === "open" ? (pay ? `Pay ${pay.amount} ${pay.a}.` : "") : "This role has closed.",
		job.summary ?? `${categoryInfo(job.category)?.label ?? "Finance"} role. Apply on the employer's site.`,
	];
	return trimTo(parts.filter(Boolean).join(" "));
}

// ---- JobPosting structured data (SEO rule 4) --------------------------------------------------

function escapeHtml(text: string): string {
	return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// "2026-10-07T02:48:51" (UTC, no zone) -> "2026-10-07T02:48:51Z"
function isoUtc(value: string): string | null {
	const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`);
	return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// Google for Jobs markup for an OPEN job, built only from data we have (fields we lack are left out,
// e.g. no validThrough: we don't know a real end date). employmentType and hiringOrganization.sameAs
// only when known. Returns null for closed jobs or jobs without a description.
export function jobPostingJsonLd(job: Job): Record<string, unknown> | null {
	if (job.status !== "open") return null;
	// Description text with its line breaks as HTML paragraphs (falls back to the summary).
	const paras = paragraphs(job.description ?? job.summary);
	if (paras.length === 0) return null;
	const description = paras.map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`).join("");

	const data: Record<string, unknown> = {
		"@context": "https://schema.org",
		"@type": "JobPosting",
		title: job.clean_title,
		description,
		directApply: false,
	};
	const posted = job.date_posted ? isoUtc(job.date_posted) : null;
	if (posted) data.datePosted = posted;
	// The same types the job page shows as a chip ("OTHER" left out).
	const types = shownEmploymentTypes(job.employment_type);
	if (types.length) data.employmentType = types.length === 1 ? types[0] : types;
	if (job.company) {
		data.hiringOrganization = {
			"@type": "Organization",
			name: job.company,
			...(job.company_website ? { sameAs: job.company_website } : {}),
			...(job.logo ? { logo: job.logo } : {}),
		};
	}
	if (job.state) {
		data.jobLocation = {
			"@type": "Place",
			address: {
				"@type": "PostalAddress",
				...(job.city ? { addressLocality: job.city } : {}),
				addressRegion: stateCode(job.state) ?? job.state,
				addressCountry: "US",
			},
		};
	}
	if (job.work_arrangement === "Remote Solely") {
		data.jobLocationType = "TELECOMMUTE";
		data.applicantLocationRequirements = { "@type": "Country", name: "US" };
	}
	// Pay in the unit the employer states it (HOUR, MONTH, ... or YEAR), as on the page.
	const pay = jobPayForMarkup(job);
	if (pay) {
		const value: Record<string, unknown> = { "@type": "QuantitativeValue", unitText: pay.unitText };
		if (pay.min && pay.max && pay.min !== pay.max) {
			value.minValue = pay.min;
			value.maxValue = pay.max;
		} else {
			value.value = pay.min || pay.max;
		}
		data.baseSalary = { "@type": "MonetaryAmount", currency: "USD", value };
	}
	return data;
}
