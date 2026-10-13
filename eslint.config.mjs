// ESLint (code checks for developers; not part of the build or deploy). Run: `npm run lint`.
// Setup from the Next.js 16 docs (node_modules/next/dist/docs/01-app/03-api-reference/05-config/03-eslint.md).
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
	...nextVitals,
	...nextTs,
	globalIgnores([
		// Default ignores of eslint-config-next:
		".next/**",
		"out/**",
		"build/**",
		"next-env.d.ts",
		// Generated files (not written by hand):
		"app/(payload)/**", // Payload's admin + API routes, copied from its template
		"payload-types.ts", // `npm run generate:types`
		"migrations/**", // `npx payload migrate:create`
		"node_modules/**",
	]),
]);

export default eslintConfig;
