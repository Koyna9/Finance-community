// Structured data for search engines (JSON-LD). "<" is escaped so text from job data can never
// close the <script> tag (Next.js JSON-LD guide).
export default function JsonLd({ data }: { data: object }) {
	return (
		<script
			type="application/ld+json"
			dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
		/>
	);
}
