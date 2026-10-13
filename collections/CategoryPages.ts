import type { CollectionConfig } from "payload";
import { bumpCacheVersionTwice } from "../lib/cache";
import { CATEGORIES } from "../shared/rules.js";

// Editable text for each category's list pages. Empty fields fall back to lib/seo.ts defaults.
export const CategoryPages: CollectionConfig = {
	slug: "category-pages",
	// Edits show on the site at once: they clear the Redis cache (lib/cache.ts).
	hooks: {
		afterChange: [async ({ doc }) => { await bumpCacheVersionTwice(); return doc; }],
		afterDelete: [async ({ doc }) => { await bumpCacheVersionTwice(); return doc; }],
	},
	admin: {
		useAsTitle: "key",
		defaultColumns: ["key", "seoTitle"],
	},
	fields: [
		{
			name: "key",
			type: "select",
			required: true,
			unique: true,
			options: CATEGORIES.map((c: { key: string; label: string }) => ({ label: c.label, value: c.key })),
		},
		{ name: "intro", type: "textarea", admin: { description: "Short intro shown at the top of the page" } },
		{ name: "seoTitle", type: "text" },
		{ name: "seoDescription", type: "textarea" },
	],
};
