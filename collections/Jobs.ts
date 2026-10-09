import type { CollectionConfig } from "payload";
import { bumpCacheVersionTwice } from "../lib/cache";
import { refreshCachedPages } from "../lib/page-cache";
import { CATEGORIES } from "../shared/rules.js";

// Any change (e.g. hiding a job in /admin) clears the site's Redis cache (lib/cache.ts) and, when
// made through the site (/admin), refreshes the cached job and salary pages (lib/page-cache.ts).
async function afterJobChange<T>({ doc }: { doc: T }): Promise<T> {
	await bumpCacheVersionTwice();
	refreshCachedPages();
	return doc;
}

// One document per job (CLAUDE.md section 7). Created by scripts/load-jobs.ts and jobs/sync.ts.
// Pages show only jobs with status "open" and hidden = false.
export const Jobs: CollectionConfig = {
	slug: "jobs",
	hooks: {
		afterChange: [afterJobChange],
		afterDelete: [afterJobChange],
	},
	admin: {
		useAsTitle: "title",
		defaultColumns: ["title", "company", "category", "level", "state", "status", "hidden", "datePosted"],
		listSearchableFields: ["title", "company"],
	},
	defaultSort: "-datePosted",
	// Compound indexes for the list pages (CLAUDE.md section 7).
	indexes: [
		{ fields: ["status", "hidden", "category", "stateSlug", "citySlug"] },
		{ fields: ["status", "hidden", "stateSlug", "citySlug"] },
		{ fields: ["status", "hidden", "level"] },
	],
	fields: [
		{ name: "sourceId", type: "number", required: true, unique: true, index: true, admin: { description: "fantastic.jobs job id" } },
		{ name: "slug", type: "text", required: true, unique: true, index: true },
		{ name: "title", type: "text", required: true, admin: { description: "Original title from the employer" } },
		{ name: "cleanTitle", type: "text", required: true, admin: { description: "Title shown on the site" } },
		{ name: "titleSlug", type: "text", index: true },
		{ name: "company", type: "text" },
		{ name: "companySlug", type: "text", index: true },
		{ name: "logo", type: "text", admin: { description: "Logo image URL" } },
		{ name: "companyIndustry", type: "text" },
		{ name: "companySize", type: "text" },
		{
			name: "category",
			type: "select",
			required: true,
			index: true,
			options: CATEGORIES.map((c: { key: string; label: string }) => ({ label: c.label, value: c.key })),
		},
		{
			name: "level",
			type: "select",
			required: true,
			index: true,
			options: [
				{ label: "Entry", value: "entry" },
				{ label: "Mid", value: "mid" },
				{ label: "Senior", value: "senior" },
				{ label: "Lead", value: "lead" },
			],
		},
		{ name: "state", type: "text" },
		{ name: "stateSlug", type: "text", index: true },
		{ name: "city", type: "text" },
		{ name: "citySlug", type: "text", index: true },
		{ name: "isRemote", type: "checkbox", defaultValue: false },
		{ name: "workArrangement", type: "text", admin: { description: "On-site, Hybrid, Remote OK, Remote Solely" } },
		{ name: "payMin", type: "number", admin: { description: "Yearly USD" } },
		{ name: "payMax", type: "number", admin: { description: "Yearly USD" } },
		{ name: "summary", type: "textarea" },
		{ name: "requirements", type: "textarea" },
		{ name: "description", type: "textarea" },
		{ name: "applyUrl", type: "text" },
		{ name: "datePosted", type: "date", index: true, admin: { date: { pickerAppearance: "dayAndTime" } } },
		{
			name: "status",
			type: "select",
			required: true,
			defaultValue: "open",
			index: true,
			options: [
				{ label: "Open", value: "open" },
				{ label: "Closed", value: "closed" },
			],
			admin: { position: "sidebar", description: "Set by the nightly sync" },
		},
		{
			name: "hidden",
			type: "checkbox",
			defaultValue: false,
			index: true,
			admin: { position: "sidebar", description: "Hide this job from the site" },
		},
	],
};
