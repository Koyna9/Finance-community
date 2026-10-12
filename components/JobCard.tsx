import Link from "next/link";
import Chip from "@/components/Chip";
import CompanyTile from "@/components/CompanyTile";
import PayChip from "@/components/PayChip";
import type { JobCardRow } from "@/lib/db";
import { blurb, categoryInfo, levelLabel, placeLabel, timeAgoShort, workStyleLabel } from "@/lib/format";

// One job row. compact (home): location, level, role, pay.
// full (list pages): one-line blurb, then location, work style, level, pay.
export default function JobCard({ job, variant }: { job: JobCardRow; variant: "compact" | "full" }) {
	const full = variant === "full";
	const posted = timeAgoShort(job.date_posted);
	const workStyle = full ? workStyleLabel(job.work_arrangement) : null;
	const summary = full ? blurb(job.summary) : null;
	// Without a work-style chip, a fully-remote job is shown as "Remote (US)".
	const place = !full && job.is_remote ? "Remote (US)" : placeLabel(job);

	return (
		<article
			className={`flex items-start gap-4 rounded-[10px] border border-border bg-surface ${full ? "p-5" : "px-5 py-[18px]"}`}
		>
			<CompanyTile company={job.company} logo={job.logo} size={full ? 52 : 48} />
			<div className="flex min-w-0 flex-auto flex-col gap-1.5">
				<div className="flex flex-wrap justify-between gap-x-3">
					{job.company && <span className="text-sm font-medium text-text-2">{job.company}</span>}
					{posted && <span className="text-[13px] text-muted">{posted}</span>}
				</div>
				<Link
					href={`/jobs/${job.slug}`}
					className={`font-semibold leading-[1.3] text-text ${full ? "text-[19px]" : "text-lg"}`}
				>
					{job.clean_title}
				</Link>
				{summary && <p className="text-[15px] leading-normal text-text-2">{summary}</p>}
				<div className={`flex flex-wrap gap-2 ${full ? "mt-1.5" : "mt-1"}`}>
					<Chip icon="pin">{place}</Chip>
					{workStyle && <Chip>{workStyle}</Chip>}
					<Chip>{levelLabel(job.level)}</Chip>
					{!full && <Chip>{categoryInfo(job.category)?.shortLabel}</Chip>}
					<PayChip pay={job} />
				</div>
			</div>
		</article>
	);
}
