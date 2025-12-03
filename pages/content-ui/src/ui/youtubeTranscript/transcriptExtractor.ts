import {
	openTranscriptPanel,
	parseTranscriptContainer,
	formatTranscriptAsText,
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
		const container = await openTranscriptPanel();

		const parseResult = parseTranscriptContainer(container);

		if (!parseResult.success) {
			return {
				success: false,
				transcript: "",
				segments: [],
				error: parseResult.error,
			};
		}

		const transcript = formatTranscriptAsText(parseResult.segments);

		return {
			success: true,
			transcript,
			segments: parseResult.segments,
		};
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Unknown error occurred";
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
