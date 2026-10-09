// PostgreSQL connection settings for Payload's pool (payload.config.ts). Used by the site, the
// release/admin/load-jobs scripts, the sync and the SQL in lib/db.ts (they all share this pool).
//
// Cloud PostgreSQL (AWS RDS, GCP Cloud SQL, ...) requires SSL, and its server certificate is signed
// by the provider's own certificate authority (CA), which Node.js does not trust by default. So give
// the CA in ONE of these two ways (setting both is an error):
//   DATABASE_CA_CERT_FILE  path to a PEM file, relative to the app folder. For AWS RDS (any region):
//                          certs/aws-rds-global-bundle.pem (AWS's public bundle, in the repo; 170 KB,
//                          too big for one environment variable: Linux allows 128 KB).
//   DATABASE_CA_CERT       the PEM text itself (small certificates only, e.g. one region's bundle).
// With a CA the connection is encrypted AND verified. Any SSL settings in DATABASE_URL (sslmode=...)
// are then ignored, because the pg library lets URL settings override these (it parses the URL last).
//   DATABASE_SSL_VERIFY    full (default) = certificate + server name must match DATABASE_URL's host
//                          (right for AWS RDS endpoints); ca = certificate only, for servers whose
//                          certificate does not contain the host you connect to (e.g. connecting by IP).
// Without a CA, DATABASE_URL is used exactly as given: locally no SSL; or "?sslmode=no-verify" for an
// encrypted connection without certificate checks (fallback).

import { readFileSync } from "node:fs";
import path from "node:path";
import type { PoolConfig } from "pg";

// Connection-string parameters that would override the `ssl` option below.
const URL_SSL_PARAMS = ["ssl", "sslmode", "sslrootcert", "sslcert", "sslkey", "sslnegotiation", "uselibpqcompat"];

export function databasePool(): PoolConfig {
	const connectionString = process.env.DATABASE_URL || "";
	const ca = caCertificate();
	if (!ca) return { connectionString };

	const verify = (process.env.DATABASE_SSL_VERIFY ?? "full").trim().toLowerCase();
	if (verify !== "full" && verify !== "ca") {
		throw new Error(`DATABASE_SSL_VERIFY must be "full" or "ca" (got "${verify}")`);
	}
	return {
		connectionString: withoutSslParams(connectionString),
		ssl: {
			ca,
			rejectUnauthorized: true, // never connect to a server whose certificate the CA did not sign
			// "ca": skip only the server-name check (the certificate itself is still verified).
			...(verify === "ca" ? { checkServerIdentity: () => undefined } : {}),
		},
	};
}

// The CA certificate(s) from DATABASE_CA_CERT_FILE or DATABASE_CA_CERT; null when neither is set.
function caCertificate(): string | null {
	const file = process.env.DATABASE_CA_CERT_FILE?.trim();
	// Secrets UIs sometimes store a PEM on one line with "\n": turn those back into line breaks.
	const text = process.env.DATABASE_CA_CERT?.replace(/\\n/g, "\n").trim();
	if (file && text) throw new Error("Set only one of DATABASE_CA_CERT_FILE and DATABASE_CA_CERT");
	if (text) return text;
	if (!file) return null;
	const fullPath = path.resolve(process.cwd(), file);
	let pem: string;
	try {
		pem = readFileSync(fullPath, "utf8");
	} catch {
		throw new Error(`DATABASE_CA_CERT_FILE: cannot read ${fullPath}`);
	}
	if (!pem.includes("BEGIN CERTIFICATE")) throw new Error(`DATABASE_CA_CERT_FILE: ${fullPath} is not a PEM certificate file`);
	return pem;
}

function withoutSslParams(connectionString: string): string {
	try {
		const url = new URL(connectionString);
		for (const name of URL_SSL_PARAMS) url.searchParams.delete(name);
		return url.toString();
	} catch {
		return connectionString; // not a URL (unusual): leave it to pg
	}
}
