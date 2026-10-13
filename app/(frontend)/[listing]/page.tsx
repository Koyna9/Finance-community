import type { Metadata } from "next";
import { ListingPage, listingMetadata, loadListing, pageParam } from "./listing";

// /finance-jobs, /<category>-jobs, /<level>-level-finance-jobs (see ./listing.tsx).
export const dynamic = "force-dynamic";

type Props = {
	params: Promise<{ listing: string }>;
	searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function load({ params, searchParams }: Props) {
	const { listing } = await params;
	return loadListing(listing, null, null, pageParam(await searchParams));
}

export async function generateMetadata(props: Props): Promise<Metadata> {
	return listingMetadata(await load(props));
}

export default async function Page(props: Props) {
	return <ListingPage data={await load(props)} />;
}
