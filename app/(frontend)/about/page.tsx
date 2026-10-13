import type { Metadata } from "next";
import Link from "next/link";
import InfoPage, { InfoSection } from "@/components/InfoPage";
import { CATEGORY_LIST } from "@/lib/format";
import { canonicalUrl, socialMetadata } from "@/lib/seo";
import { SITE_NAME } from "@/lib/site";

// About page (SEO audit 2026-10-12, section 6: who we are and how the site works). Plain text;
// who runs the site and a contact address are added once the company has decided them.
export const dynamic = "force-dynamic";

const PATH = "/about";

export async function generateMetadata(): Promise<Metadata> {
	const description =
		`${SITE_NAME} lists finance jobs at US companies, taken from employers' own careers sites. ` +
		"Browse by role, location, level, title and company, and apply directly with the employer.";
	return {
		title: "About Us", // the layout adds " — <SITE_NAME>"
		description,
		alternates: { canonical: canonicalUrl(PATH) },
		...socialMetadata(`About ${SITE_NAME}`, description, PATH),
	};
}

export default function AboutPage() {
	return (
		<InfoPage
			path={PATH}
			crumb="About"
			title={`About ${SITE_NAME}`}
			intro="A job board for finance roles at US companies. Every job comes from the employer's own careers site, and you apply directly with the company."
		>
			<InfoSection id="what" title="What you'll find here">
				<p>
					Open finance jobs at companies across the United States, in eight areas:{" "}
					{CATEGORY_LIST.map((c, i) => (
						<span key={c.key}>
							<Link href={c.path} className="font-semibold text-accent-text">
								{c.label}
							</Link>
							{i < CATEGORY_LIST.length - 2 ? ", " : i === CATEGORY_LIST.length - 2 ? " and " : "."}
						</span>
					))}
				</p>
				<p>
					You can browse them by role, by{" "}
					<Link href="/locations" className="font-semibold text-accent-text">
						state and city
					</Link>
					, by experience level, by{" "}
					<Link href="/titles" className="font-semibold text-accent-text">
						job title
					</Link>{" "}
					and by{" "}
					<Link href="/companies" className="font-semibold text-accent-text">
						company
					</Link>
					, and see what each role pays on our{" "}
					<Link href="/salaries" className="font-semibold text-accent-text">
						salary pages
					</Link>
					.
				</p>
			</InfoSection>

			<InfoSection id="different" title="What makes it different">
				<ul className="flex list-disc flex-col gap-2 pl-5">
					<li>Only real jobs from employers&apos; own careers sites. Recruitment agencies are left out.</li>
					<li>Pay is shown only when the employer states it. We never estimate or invent pay.</li>
					<li>
						Every night we check which jobs employers have closed. A closed job says so on its page and leaves the
						lists.
					</li>
					<li>No account, no sign-up: you apply on the company&apos;s own site, so your application goes straight to them.</li>
				</ul>
			</InfoSection>

			<InfoSection id="more" title="More about our data">
				<p>
					Where the jobs come from, how we sort them and how the salary figures work:{" "}
					<Link href="/how-we-source-jobs" className="font-semibold text-accent-text">
						How we source jobs →
					</Link>
				</p>
			</InfoSection>
		</InfoPage>
	);
}
