import type { CollectionConfig } from "payload";

// Admin logins for /admin only (email + password). No visitor accounts.
export const Users: CollectionConfig = {
	slug: "users",
	admin: {
		useAsTitle: "email",
	},
	auth: true,
	fields: [
		// Email and password are added by Payload.
	],
};
