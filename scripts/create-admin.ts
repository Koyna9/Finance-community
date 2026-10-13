// Create the first admin login for /admin (CLAUDE.md section 7), e.g. as a one-off TrueFoundry job.
// Reads ADMIN_EMAIL and ADMIN_PASSWORD from the environment and never prints the password.
// Creates a user ONLY if there are no users yet; otherwise it changes nothing. Safe to run again.
//
//   ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run create-admin   (= payload run scripts/create-admin.ts)

import { getPayload } from "payload";
import config from "../payload.config";

const MIN_PASSWORD_LENGTH = 12;

const payload = await getPayload({ config });

const { totalDocs } = await payload.count({ collection: "users" });
if (totalDocs > 0) {
	console.log(`An admin user already exists (${totalDocs} user${totalDocs === 1 ? "" : "s"}); nothing changed.`);
	process.exit(0);
}

const email = process.env.ADMIN_EMAIL?.trim();
const password = process.env.ADMIN_PASSWORD ?? "";
if (!email || !password) {
	console.error("No users yet, but ADMIN_EMAIL and/or ADMIN_PASSWORD is not set; nothing created.");
	process.exit(1);
}
if (password.length < MIN_PASSWORD_LENGTH) {
	console.error(`ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters; nothing created.`);
	process.exit(1);
}

try {
	await payload.create({ collection: "users", data: { email, password } });
} catch (err) {
	// Payload's validation messages name the field, never its value.
	console.error(`Could not create the admin user: ${err instanceof Error ? err.message : String(err)}`);
	process.exit(1);
}
console.log(`Admin user created: ${email}. Log in at /admin.`);
process.exit(0);
