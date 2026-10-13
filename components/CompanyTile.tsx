"use client";

import { useEffect, useRef, useState } from "react";
import { initials } from "@/lib/format";

const SIZES = {
	48: "h-12 w-12 basis-12 rounded-[9px] text-base", // home cards
	52: "h-[52px] w-[52px] basis-[52px] rounded-[10px] text-[17px]", // list cards
	64: "h-16 w-16 basis-16 rounded-xl text-[21px]", // job page
};

// Company logo, or 2-letter initials when there is no logo (or it fails to load).
export default function CompanyTile({
	company,
	logo,
	size,
}: {
	company: string | null;
	logo: string | null;
	size: keyof typeof SIZES;
}) {
	const [failed, setFailed] = useState(false);
	const img = useRef<HTMLImageElement>(null);
	// A logo can fail to load BEFORE this component starts in the browser; onError then never fires.
	// So check once on start: a finished image with no size failed (e.g. the host answers 403).
	useEffect(() => {
		const el = img.current;
		if (el?.complete && el.naturalWidth === 0) setFailed(true);
	}, []);
	const box = `flex shrink-0 grow-0 items-center justify-center overflow-hidden ${SIZES[size]}`;

	if (logo && !failed) {
		return (
			<span className={`${box} border border-border-soft bg-surface`}>
				{/* Plain <img>: logos come from many outside hosts and are tiny. */}
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img
					ref={img}
					src={logo}
					alt=""
					width={size}
					height={size}
					loading="lazy"
					className="h-full w-full object-contain"
					onError={() => setFailed(true)}
				/>
			</span>
		);
	}
	return (
		<span aria-hidden="true" className={`${box} bg-logo-tile font-bold text-ink`}>
			{initials(company)}
		</span>
	);
}
