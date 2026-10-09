// PostgreSQL connection settings for Payload's pool (payload.config.ts). Used by the site, the
// release/admin/load-jobs scripts, the sync and the SQL in lib/db.ts (they all share this pool).
//
// SSL comes only from DATABASE_URL. Cloud PostgreSQL (AWS RDS) requires SSL: add "?sslmode=require",
// e.g. postgres://USER:PASSWORD@<rds-endpoint>:5432/DBNAME?sslmode=require (encrypted connection).
//
// The pg library (8.x) reads sslmode=require/prefer/verify-ca as "verify-full" (it would check the
// server certificate against Node.js's built-in CAs, which don't include AWS's, and fail). So for the
// standard libpq values we add "uselibpqcompat=true": then sslmode means exactly what it means in psql
// and pg_restore (require = encrypted, certificate not checked). Other values (e.g. pg's own
// "no-verify") and URLs without sslmode are passed through unchanged; locally there is no sslmode.

import type { PoolConfig } from "pg";

const LIBPQ_SSL_MODES = ["disable", "prefer", "require", "verify-ca", "verify-full"];

export function databasePool(): PoolConfig {
	return { connectionString: withStandardSslMode(process.env.DATABASE_URL || "") };
}

function withStandardSslMode(connectionString: string): string {
	try {
		const url = new URL(connectionString);
		const mode = url.searchParams.get("sslmode");
		if (!mode || !LIBPQ_SSL_MODES.includes(mode) || url.searchParams.has("uselibpqcompat")) return connectionString;
		url.searchParams.set("uselibpqcompat", "true");
		return url.toString();
	} catch {
		return connectionString; // not a URL (unusual): leave it to pg
	}
}
