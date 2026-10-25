export type MemoBodySegment =
	| { type: "text"; text: string }
	| { type: "link"; href: string };

export interface MemoBodyLine {
	/** 줄 맨 앞의 글머리(`-`, `1.` 등). 글머리가 없는 줄이면 null */
	marker: string | null;
	segments: MemoBodySegment[];
}

const LIST_MARKER_PATTERN = /^([-*•]|\d{1,3}[.)]) (?=\S)/;
const URL_PATTERN = /https?:\/\/[^\s<>"']+/g;
const TRAILING_PUNCTUATION_PATTERN = /[.,!?;:'"\]}>]+$/;

/** 문장 끝에 붙은 문장부호는 링크에서 뺀다. 괄호는 URL 안에 여는 괄호가 있을 때만 남긴다. */
const trimUrl = (url: string) => {
	let trimmed = url.replace(TRAILING_PUNCTUATION_PATTERN, "");
	while (trimmed.endsWith(")") && !trimmed.includes("(")) {
		trimmed = trimmed.slice(0, -1).replace(TRAILING_PUNCTUATION_PATTERN, "");
	}
	return trimmed;
};

const splitLinks = (text: string): MemoBodySegment[] => {
	const segments: MemoBodySegment[] = [];
	let cursor = 0;

	for (const match of text.matchAll(URL_PATTERN)) {
		const href = trimUrl(match[0]);
		if (!href.match(/^https?:\/\/[^/]/)) continue;

		const start = match.index;
		if (start > cursor) {
			segments.push({ type: "text", text: text.slice(cursor, start) });
		}
		segments.push({ type: "link", href });
		cursor = start + href.length;
	}

	if (cursor < text.length) {
		segments.push({ type: "text", text: text.slice(cursor) });
	}
	return segments;
};

/** 카드에 보여 줄 메모 본문을 줄 단위로 나눠 글머리와 링크를 찾는다. 원문 글자는 그대로 둔다. */
export const parseMemoBody = (text: string): MemoBodyLine[] =>
	text.split("\n").map((line) => {
		const marker = line.match(LIST_MARKER_PATTERN)?.[1] ?? null;
		return { marker, segments: splitLinks(line) };
	});
