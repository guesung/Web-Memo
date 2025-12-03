import {
	formatTranscriptAsText,
	openTranscriptPanel,
	parseTranscriptContainer,
	type TranscriptSegment,
} from "./utils";

export interface ExtractionResult {
	success: boolean;
	transcript: string;
	segments: TranscriptSegment[];
	error?: string;
}

export async function extractYoutubeTranscript(): Promise<ExtractionResult> {
	try {
		console.log("[YT Transcript] Opening transcript panel...");
		const container = await openTranscriptPanel();
		console.log("[YT Transcript] Panel opened, container:", container.tagName);

		const parseResult = parseTranscriptContainer(container);
		console.log("[YT Transcript] Parse result:", {
			success: parseResult.success,
			segmentCount: parseResult.segments.length,
			error: parseResult.error,
		});

		if (!parseResult.success) {
			return {
				success: false,
				transcript: "",
				segments: [],
				error: parseResult.error,
			};
		}

		const transcript = formatTranscriptAsText(parseResult.segments);
		console.log(
			"[YT Transcript] Extraction complete:",
			transcript.substring(0, 200) + "...",
		);

		return {
			success: true,
			transcript,
			segments: parseResult.segments,
		};
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Unknown error occurred";
		console.error("[YT Transcript] Extraction failed:", message);
		return {
			success: false,
			transcript: "",
			segments: [],
			error: message,
		};
	}
}

export function isYoutubePage(): boolean {
	return (
		window.location.hostname.includes("youtube.com") &&
		window.location.pathname === "/watch"
	);
}
