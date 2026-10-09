import type { Metadata } from "next";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { fontClasses } from "@/lib/fonts";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";
import "../globals.css";

// Root layout of the public site. (Payload's admin has its own root layout in app/(payload)/.)
// Header and footer read from the database. Each page sets its own rendering (SEO rule 7): job
// and salary-category pages are cached for up to 15 minutes, all other pages render per request.

export const metadata: Metadata = {
	title: { default: SITE_NAME, template: `%s — ${SITE_NAME}` },
	description: SITE_DESCRIPTION,
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className={fontClasses}>
			<head>
				<link rel="icon" href="/favicon.svg" type="image/svg+xml"></link>
			</head>
			<body className="flex min-h-screen flex-col">
				<Header />
				<div className="flex-1">{children}</div>
				<Footer />
			</body>
		</html>
	);
}
