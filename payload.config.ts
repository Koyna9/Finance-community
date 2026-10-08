// Payload CMS setup (CLAUDE.md sections 4 and 7): PostgreSQL adapter, collections, globals, admin.
import { postgresAdapter } from "@payloadcms/db-postgres";
import path from "path";
import { buildConfig } from "payload";
import { fileURLToPath } from "url";
import { CategoryPages } from "./collections/CategoryPages";
import { Jobs } from "./collections/Jobs";
import { SyncRuns } from "./collections/SyncRuns";
import { Users } from "./collections/Users";
import { SiteText } from "./globals/SiteText";
import { SITE_NAME } from "./lib/site";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default buildConfig({
	admin: {
		user: Users.slug,
		importMap: { baseDir: path.resolve(dirname) },
		meta: {
			titleSuffix: ` — ${SITE_NAME} admin`,
			robots: "noindex, nofollow",
		},
	},
	collections: [Jobs, CategoryPages, SyncRuns, Users],
	globals: [SiteText],
	secret: process.env.PAYLOAD_SECRET || "",
	typescript: { outputFile: path.resolve(dirname, "payload-types.ts") },
	db: postgresAdapter({
		pool: { connectionString: process.env.DATABASE_URL || "" },
		// Tables change only through migrations (never auto-"push" in dev).
		push: false,
		migrationDir: path.resolve(dirname, "migrations"),
	}),
});
