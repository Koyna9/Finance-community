import type { Metadata } from "next";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import NotFoundContent from "@/components/NotFoundContent";
import { fontClasses } from "@/lib/fonts";
import { SITE_NAME } from "@/lib/site";
import "./globals.css";

// 404 for URLs that match no route at all. Needed because the site and Payload's admin each have
// their own root layout (next.config.ts: experimental.globalNotFound). It skips the site layout,
// so it renders the same header, 404 content and footer itself.
// The footer reads the database, so render per request (not at build time).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
	title: `Page not found — ${SITE_NAME}`,
	robots: { index: false },
};

export default function GlobalNotFound() {
	return (
		<html lang="en" className={fontClasses}>
			<head>
				<link rel="icon" href="/favicon.svg" type="image/svg+xml"></link>
			</head>
			<body className="flex min-h-screen flex-col">
				<Header />
				<div className="flex-1">
					<NotFoundContent />
				</div>
				<Footer />
			</body>
		</html>
	);
}
