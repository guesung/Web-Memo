import { TRANSCRIPT_CONFIG } from "../config";

const { selectors, validation } = TRANSCRIPT_CONFIG;

export interface TranscriptSegment {
	timestamp: string;
	text: string;
}

export interface ParseResult {
	success: boolean;
	segments: TranscriptSegment[];
	error?: string;
}

function findElementInContainer(
	container: Element,
	selectorList: readonly string[],
): Element | null {
	for (const selector of selectorList) {
		const element = container.querySelector(selector);
		if (element?.textContent?.trim()) {
			return element;
		}
	}
	return null;
}

function extractTimestampFromDataAttribute(element: Element): string {
	const startMs = element.getAttribute("data-start-ms");
	if (startMs) {
		const ms = Number.parseInt(startMs, 10);
		const minutes = Math.floor(ms / 60000);
		const seconds = Math.floor((ms % 60000) / 1000);
		return `${minutes}:${seconds.toString().padStart(2, "0")}`;
	}
	return "";
}

function extractFromAriaLabel(element: Element): TranscriptSegment | null {
	const ariaLabel = element.getAttribute("aria-label");
	if (!ariaLabel) return null;

	const match = ariaLabel.match(/(\d+:\d+|\d+초)\s*(.+)/);
	if (match?.[2]) {
		return {
			timestamp: match[1],
			text: match[2].trim(),
		};
	}
	return null;
}

function cleanText(text: string): string {
	return text
		.replace(/^\d+:\d+\s*/, "")
		.replace(/^\d+초\s*/, "")
		.trim();
}

function isValidText(text: string): boolean {
	return (
		text.length >= validation.minTextLength &&
		text.length <= validation.maxTextLength
	);
}

function parseSegment(segment: Element): TranscriptSegment | null {
	if (!(segment instanceof HTMLElement)) {
		return null;
	}

	let timestamp = "";
	let text = "";

	const timestampEl = findElementInContainer(segment, selectors.timestamp);
	if (timestampEl) {
		timestamp = timestampEl.textContent?.trim() ?? "";
	}

	const textEl = findElementInContainer(segment, selectors.text);
	if (textEl) {
		text = textEl.textContent?.trim() ?? "";
	}

	if (!text) {
		const fullText = segment.textContent?.trim() ?? "";
		text = cleanText(fullText);
	}

	if (!text) {
		const ariaResult = extractFromAriaLabel(segment);
		if (ariaResult) {
			return ariaResult;
		}
	}

	if (!timestamp) {
		timestamp = extractTimestampFromDataAttribute(segment);
	}

	if (isValidText(text)) {
		return { timestamp, text };
	}

	return null;
}

function tryPatternMatching(container: Element): TranscriptSegment[] {
	const segments: TranscriptSegment[] = [];
	const fullText = container.textContent ?? "";

	const patterns = [
		/(\d+:\d+)\s+(.+?)(?=\d+:\d+|$)/g,
		/(\d+초)\s+(.+?)(?=\d+초|$)/g,
	];

	for (const pattern of patterns) {
		const matches = [...fullText.matchAll(pattern)];
		if (matches.length > 0) {
			for (const match of matches) {
				const text = match[2].trim();
				if (isValidText(text)) {
					segments.push({
						timestamp: match[1],
						text,
					});
				}
			}
			break;
		}
	}

	return segments;
}

export function parseTranscriptContainer(container: Element): ParseResult {
	const segments: TranscriptSegment[] = [];

	let segmentElements: Element[] = [];
	for (const selector of selectors.transcriptSegment) {
		const elements = container.querySelectorAll(selector);
		if (elements.length > 0) {
			segmentElements = Array.from(elements);
			break;
		}
	}

	if (segmentElements.length === 0) {
		return {
			success: false,
			segments: [],
			error: "No transcript segments found",
		};
	}

	for (const segment of segmentElements) {
		const parsed = parseSegment(segment);
		if (parsed) {
			segments.push(parsed);
		}
	}

	if (segments.length === 0) {
		const patternSegments = tryPatternMatching(container);
		if (patternSegments.length > 0) {
			return {
				success: true,
				segments: patternSegments,
			};
		}

		return {
			success: false,
			segments: [],
			error: "Failed to extract text from segments",
		};
	}

	return {
		success: true,
		segments,
	};
}

export function formatTranscriptAsText(segments: TranscriptSegment[]): string {
	return segments
		.map((segment) =>
			segment.timestamp ? `${segment.timestamp} ${segment.text}` : segment.text,
		)
		.join("\n");
}
