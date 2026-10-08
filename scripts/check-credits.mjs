// First API call of the project (CLAUDE.md section 6, budget rule 1): fetch ONE job
// with our filters and print the credit headers. Costs 1 Jobs credit.
// Run: node scripts/check-credits.mjs

import { mkdirSync, writeFileSync } from "node:fs";
import { apiGet, baseFilters } from "./fantastic.mjs";

const { status, body, credits } = await apiGet("/active-ats", {
  ...baseFilters(),
  time_frame: "7d",
  limit: "1",
  description_format: "text",
  include_basic_organization_details: "true",
});

console.log("HTTP status:", status);
console.log("Credit headers:", credits);

if (status !== 200) {
  console.log("Error body:", body);
  process.exit(1);
}

mkdirSync(new URL("../data/", import.meta.url), { recursive: true });
writeFileSync(new URL("../data/first-job.json", import.meta.url), JSON.stringify(body, null, 2));
console.log(`Jobs returned: ${body.length} (saved to data/first-job.json)`);
