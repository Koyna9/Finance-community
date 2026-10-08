import type { GlobalConfig } from "payload";

// Editable home page text + default SEO description. Empty fields fall back to the current text.
export const SiteText: GlobalConfig = {
	slug: "site-text",
	fields: [
		{ name: "homeHeadline", type: "text" },
		{ name: "homeSubline", type: "textarea" },
		{ name: "defaultSeoDescription", type: "textarea" },
	],
};
