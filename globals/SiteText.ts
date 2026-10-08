import type { GlobalConfig } from "payload";
import { bumpCacheVersionTwice } from "../lib/cache";

// Editable home page text + default SEO description. Empty fields fall back to the current text.
export const SiteText: GlobalConfig = {
	slug: "site-text",
	// Edits show on the site at once: they clear the Redis cache (lib/cache.ts).
	hooks: {
		afterChange: [async ({ doc }) => { await bumpCacheVersionTwice(); return doc; }],
	},
	fields: [
		{ name: "homeHeadline", type: "text", admin: { description: "Big headline on the home page. Empty = the current headline." } },
		{ name: "homeSubline", type: "textarea", admin: { description: "Text under the home headline. Empty = the current text." } },
		{
			name: "defaultSeoDescription",
			type: "textarea",
			admin: { description: "Home page meta description for Google (about 150 characters). Empty = the generated one with the job count." },
		},
	],
};
