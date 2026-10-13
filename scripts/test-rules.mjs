// Tiny check of shared/rules.js: run `node scripts/test-rules.mjs`.

import { toRow, cleanTitle, cleanCompany, levelFor, slugify, companyWebsite, employmentTypes, statedPay } from "../shared/rules.js";

const base = {
  countries_derived: ["United States"],
  organization: "Acme Corp",
  org_logo_permalink: null,
  url: "https://example.com/apply",
  date_posted: "2026-10-01T00:00:00",
  ai_work_arrangement: "On-site",
  ai_salary_currency: "USD",
};

const fakeJobs = [
  { ...base, id: 1, title: "Sr. Financial Analyst - FP&A (Austin)",
    regions_derived: ["Texas"], cities_derived: ["Austin"],
    ai_salary_min_value: 85000, ai_salary_max_value: 105000, ai_salary_unit_text: "YEAR" },
  { ...base, id: 2, title: "Staff Accountant",
    regions_derived: ["California"], cities_derived: [],
    ai_salary_min_value: 40, ai_salary_max_value: 50, ai_salary_unit_text: "HOUR",
    ai_experience_level: "0-2" },
  { ...base, id: 3, title: "Tax Manager", ai_work_arrangement: "Remote Solely",
    regions_derived: [], cities_derived: [] },
  { ...base, id: 4, title: "Financial Analyst", countries_derived: ["Canada"],
    regions_derived: ["Ontario"], cities_derived: ["Toronto"] },
  { ...base, id: 5, title: "Registered Nurse",
    regions_derived: ["New York"], cities_derived: ["New York"] },
];

const labels = ["state + city", "state only", "remote", "non-US", "non-finance"];
fakeJobs.forEach((job, i) => {
  const row = toRow(job);
  console.log(`\n#${job.id} ${labels[i]}: "${job.title}"`);
  if (!row) return console.log("  -> skipped (null)");
  const { slug, clean_title, category, level, state, city, is_remote, pay_min, pay_max } = row;
  console.log("  ->", { slug, clean_title, category, level, state, city, is_remote, pay_min, pay_max });
});

// A few extra rule checks.
console.log("\nExtra checks:");
const checks = [
  [cleanTitle("Full-Charge Bookkeeper"), "Full-Charge Bookkeeper"],
  [cleanTitle("FP&A Manager"), "FP&A Manager"],
  [cleanTitle("Head of Finance, North America"), "Head of Finance"],
  [cleanTitle("Accountant II"), "Accountant"],
  [cleanTitle("Associate - Investment Accounting"), "Investment Accounting Associate"],
  [cleanTitle("Associate (Tax)"), "Tax Associate"],
  [cleanTitle("Senior Specialist, Tax"), "Tax Specialist"],
  [cleanTitle("Senior Manager, Accounting"), "Accounting Manager"],
  [cleanTitle("Senior Director, FP&A"), "FP&A Director"],
  [cleanTitle("Analyst,  Accounts Receivable"), "Accounts Receivable Analyst"],
  [cleanTitle("Senior Manager, IT Audit"), "IT Audit Manager"],
  [cleanTitle("Workforce Excellence Specialist, National Tax Operations"), "National Tax Operations"],
  [cleanTitle("Summer 2027 Tax Internship (Coral Gables, FL)"), "Summer Tax Internship"],
  [cleanTitle("BSA Compliance Assistant"), "BSA Compliance Assistant"],
  [cleanTitle("Internal Audit, Risk, Business Audit, Associate, Salt Lake City"), "Internal Audit"],
  [toRow({ ...base, id: 9, title: "Accounts Payable Clerk", regions_derived: ["Minnesota"],
    organization: "No relevant LinkedIn company found.PIPESTONE" }).company, "PIPESTONE"],
  [cleanTitle("Sr. Financial Analyst - FP&A (Austin)"), "Financial Analyst"],
  [slugify("Children's Law Center"), "childrens-law-center"],
  [slugify("FP&A Manager"), "fp-and-a-manager"],
  [levelFor("Finance Business Partner"), "mid"],
  [levelFor("Senior Finance Business Partner"), "senior"],
  [levelFor("Partner, Audit"), "lead"],
  // Company names (SEO audit 2026-10-12, 3.5).
  [cleanCompany("Jackson Hewitt - 1558"), "Jackson Hewitt"],
  [cleanCompany("Kirby-Smith Machinery, Inc. - Oklahoma City, OK"), "Kirby-Smith Machinery, Inc."],
  [cleanCompany("The Learning Experiene -  Huntington Beach, CA"), "The Learning Experiene"],
  [cleanCompany("DGI - Menard INC"), "DGI - Menard INC"],
  [cleanCompany("PMM - America's Technology Molder"), "PMM - America's Technology Molder"],
  [cleanCompany("ServiceMaster Restore 10188 - Doral"), "ServiceMaster Restore 10188 - Doral"],
  [cleanCompany("Stanley 1913"), "Stanley 1913"],
  [cleanCompany("Acme - Springfield, XX"), "Acme - Springfield, XX"],
  [cleanCompany("No relevant LinkedIn company found."), null],
  // Company website, employment type, stated pay (SEO audit 2026-10-12).
  [companyWebsite({ org_linkedin_website: "http://https://ronaldmcdonaldhouseoregon.org" }), "https://ronaldmcdonaldhouseoregon.org/"],
  [companyWebsite({ org_linkedin_website: "www.crescolabs.com" }), "https://www.crescolabs.com/"],
  [companyWebsite({ org_linkedin_website: "not a site" }), null],
  [companyWebsite({}), null],
  [employmentTypes({ ai_employment_type: ["INTERN", "FULL_TIME", "INTERN", "VOLUNTEER"] }).join(","), "INTERN,FULL_TIME"],
  [employmentTypes({}).join(","), ""],
  [JSON.stringify(statedPay({ ai_salary_currency: "USD", ai_salary_unit_text: "HOUR", ai_salary_min_value: 21.63, ai_salary_max_value: 26.92 })),
    '{"pay_unit":"HOUR","pay_stated_min":21.63,"pay_stated_max":26.92}'],
  [JSON.stringify(statedPay({ ai_salary_currency: "USD", ai_salary_unit_text: "MONTH", ai_salary_value: 300 })),
    '{"pay_unit":"MONTH","pay_stated_min":300,"pay_stated_max":300}'],
  [JSON.stringify(statedPay({ ai_salary_currency: "EUR", ai_salary_unit_text: "YEAR", ai_salary_value: 50000 })),
    '{"pay_unit":null,"pay_stated_min":null,"pay_stated_max":null}'],
];
for (const [got, want] of checks) {
  console.log(`  ${got === want ? "OK  " : "FAIL"} ${JSON.stringify(got)}${got === want ? "" : ` (wanted ${JSON.stringify(want)})`}`);
}
