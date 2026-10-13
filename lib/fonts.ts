// IBM Plex fonts (design/DESIGN.md section 2), shared by the site layout and the global 404 page.
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";

const plexSans = IBM_Plex_Sans({
	variable: "--font-plex-sans",
	subsets: ["latin"],
	weight: ["400", "500", "600", "700"],
	display: "swap",
});

const plexMono = IBM_Plex_Mono({
	variable: "--font-plex-mono",
	subsets: ["latin"],
	weight: ["500", "600"],
	display: "swap",
});

// Put on <html> so Tailwind's font-sans / font-mono can use the variables.
export const fontClasses = `${plexSans.variable} ${plexMono.variable} antialiased`;
