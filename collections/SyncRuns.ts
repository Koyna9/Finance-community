import type { CollectionConfig } from "payload";

// One document per nightly sync run (CLAUDE.md section 10). Written by jobs/sync.ts through the
// Local API (which skips these access rules); read-only in the admin.
export const SyncRuns: CollectionConfig = {
	slug: "sync-runs",
	admin: {
		useAsTitle: "ranAt",
		defaultColumns: ["ranAt", "added", "closed", "error"],
	},
	defaultSort: "-ranAt",
	access: {
		create: () => false,
		update: () => false,
		delete: () => false,
	},
	fields: [
		{ name: "ranAt", type: "date", required: true, admin: { date: { pickerAppearance: "dayAndTime" } } },
		{ name: "added", type: "number", defaultValue: 0 },
		{ name: "closed", type: "number", defaultValue: 0 },
		{ name: "error", type: "text", admin: { description: 'Error, or "stopped: ..." note' } },
	],
};
