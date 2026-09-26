import {
	STREAM_DATA_PREFIX,
	STREAM_DONE_MARKER,
} from "@web-memo/shared/constants";
import {
	ChromeSyncStorage,
	STORAGE_KEYS,
} from "@web-memo/shared/modules/chrome-storage";
import type { Category } from "@web-memo/shared/modules/extension-bridge";
import { DEFAULT_LANGUAGE, LANGUAGE_NAME } from "./constant";
import { DEFAULT_PROMPTS, PROMPT } from "./prompt";

/** 요약 언어와 콘텐츠 유형. */
interface IFGetSystemPromptProps {
	language: "ko" | "en";
	category: Category;
}

/** 요약 스트림 처리 중 실패한 단계. */
type TStreamFailureStage = "reader" | "parse" | "server";

/** 요약 스트림 오류와 실패 단계를 전달하는 콜백. */
type TStreamErrorHandler = (
	error: string,
	streamFailureStage: TStreamFailureStage,
) => void;

/** 저장된 언어와 콘텐츠 유형에 맞춰 요약 요청 메시지를 구성한다. */
export const getSummaryPrompt = async (content: string, category: Category) => {
	const language = await ChromeSyncStorage.get<string>(STORAGE_KEYS.language);
	const validLanguage: "ko" | "en" =
		language === "ko" || language === "en" ? language : DEFAULT_LANGUAGE;
	const systemPrompt = getSystemPrompt({
		language: validLanguage,
		category,
	});

	return [
		{ role: "system", content: systemPrompt },
		{ role: "user", content: content },
	];
};

const getSystemPrompt = (props: IFGetSystemPromptProps) => {
	const languagePrompt = `${PROMPT.language} ${LANGUAGE_NAME[props.language]}.`;
	let summaryPrompt = DEFAULT_PROMPTS.web[props.language];

	if (props.category === "youtube") {
		summaryPrompt = DEFAULT_PROMPTS.youtube[props.language];
	}

	return [summaryPrompt, languagePrompt, PROMPT.default].join("\n\n");
};

/** 요약 응답 스트림을 읽어 텍스트 조각과 오류를 콜백으로 전달한다. */
export const processStreamingResponse = async (
	response: Response,
	onContentParsed: (content: string) => void,
	onError: TStreamErrorHandler,
) => {
	const reader = response.body?.getReader();
	if (!reader) {
		onError("요약 응답 본문을 읽을 수 없습니다.", "reader");
		return;
	}

	const decoder = new TextDecoder();
	let buffer = "";

	while (true) {
		let done = false;
		let value: Uint8Array | undefined;

		try {
			const readResult = await reader.read();
			done = readResult.done;
			value = readResult.value;
		} catch (error) {
			onError(
				error instanceof Error
					? error.message
					: "요약 응답을 읽는 중 오류가 발생했습니다.",
				"reader",
			);
			return;
		}

		if (done) break;
		if (!value) continue;

		try {
			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split("\n");
			buffer = lines.pop() || "";

			for (const line of lines) {
				if (line.startsWith(STREAM_DATA_PREFIX)) {
					const data = line.slice(STREAM_DATA_PREFIX.length);
					if (data === STREAM_DONE_MARKER) return;

					try {
						const parsed = JSON.parse(data);
						if (parsed.content) {
							onContentParsed(parsed.content);
						} else if (parsed.error) {
							onError(parsed.error, "server");
							return;
						}
					} catch {
						onError("요약 스트림 파싱 실패", "parse");
						return;
					}
				}
			}
		} catch {
			onError("요약 스트림 파싱 실패", "parse");
			return;
		}
	}
};

/** 누적 요약의 Markdown 표식을 제거하며 미완성 스트림의 본문과 URL도 보존한다. */
export const formatSummaryText = (summary: string): string => {
	const protectedText: string[] = [];
	const protectText = (value: string) => {
		protectedText.push(value);

		return `\uE000${protectedText.length - 1}\uE000`;
	};
	let codeFence = "";
	let isInTable = false;
	const lines = summary.replace(/\r\n?/g, "\n").split("\n");
	const formattedLines = lines.map((line, index) => {
		const fence = line.match(/^\s*(`{3,}|~{3,})/);

		if (fence && !line.trimStart().slice(fence[1].length).includes(fence[1])) {
			if (!codeFence) {
				codeFence = fence[1];
			} else if (
				fence[1][0] === codeFence[0] &&
				fence[1].length >= codeFence.length
			) {
				codeFence = "";
			} else {
				return protectText(line);
			}

			return "";
		}

		if (codeFence) {
			return protectText(line);
		}

		if (/^\s*(?:([-*_])\s*){3,}$/.test(line) || /^\s*=+\s*$/.test(line)) {
			return "";
		}

		if (/^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)+\|?\s*$/.test(line)) {
			isInTable = true;

			return "";
		}

		let text = line
			.replace(/^\s{0,3}(?:>\s*)+/, "")
			.replace(/^\s{0,3}#{1,6}(?:\s+|$)(.*)$/, (_match, heading: string) =>
				heading.replace(/\s+#+\s*$/, ""),
			)
			.replace(/^(\s*)(?:[-+*]|\d+[.)])\s+(?:\[[ xX]\]\s*)?/, "$1• ");
		isInTable = isInTable && text.includes("|");
		const isTableRow =
			isInTable ||
			/^\s*\|/.test(text) ||
			/^\s*\|?\s*:?-+:?\s*\|/.test(lines[index + 1] ?? "");

		if (isTableRow) {
			text = text
				.replace(/^\s*\||(?<!\\)\|\s*$/g, "")
				.replace(/(?<!\\)\s*\|\s*/g, " · ")
				.trim();
		}

		return text;
	});

	return formatSummaryInlineText(formattedLines.join("\n"), protectText)
		.replace(/\n{3,}/g, "\n\n")
		.trim()
		.replace(
			/\uE000(\d+)\uE000/g,
			(_match, index: string) => protectedText[Number(index)],
		);
};

/** 코드와 URL을 보존하면서 강조 및 미완성 링크 표식을 정리한다. */
const formatSummaryInlineText = (
	text: string,
	protectText: (value: string) => string,
) => {
	const codeProtectedText = text.replace(
		/(`+)([^`]*)(?:\1|$)/g,
		(_match, _marker, content: string) => protectText(content),
	);
	let formattedText = formatSummaryLinks(codeProtectedText, protectText)
		.replace(/<(https?:\/\/[^>]+)>/g, (_match, url: string) => protectText(url))
		.replace(
			/https?:\/\/[^\s\uE000]+/g,
			(url, offset: number, input: string) => {
				const prefix = input.slice(0, offset);
				const markers =
					prefix.match(/\*{1,3}|(?<!\w)_{1,3}|_{1,3}(?!\w)|~~/g) ?? [];
				const marker = markers.findLast(
					(candidate) =>
						url.endsWith(candidate) &&
						markers.filter((value) => value === candidate).length % 2 === 1,
				);

				if (marker) {
					return `${protectText(url.slice(0, -marker.length))}${marker}`;
				}

				return protectText(url);
			},
		)
		.replace(/\\([\\`*{}[\]()#+\-.!_>~|])/g, (_match, literal: string) =>
			protectText(literal),
		);
	let previousText = "";

	while (formattedText !== previousText) {
		previousText = formattedText;
		formattedText = formattedText.replace(
			/(\*{1,3}|_{1,3}|~~)(?=\S)([\s\S]+?)\1/g,
			(
				match,
				marker: string,
				content: string,
				offset: number,
				input: string,
			) => {
				if (
					marker.startsWith("_") &&
					/[\p{L}\p{N}]/u.test(input[offset - 1] ?? "")
				) {
					return match;
				}

				return content;
			},
		);
	}

	return formattedText
		.replace(/(^|[\s(])(?:\*{1,3}|_{1,3}|~~)(?=\S|$)/g, "$1")
		.replace(/(?:\*{1,3}|~~)$/, "")
		.replace(/!?\[([^\]\n]*)\]?$/, "$1");
};

/** 중첩된 URL 괄호를 세어 완성되거나 아직 생성 중인 링크를 일반 텍스트로 바꾼다. */
const formatSummaryLinks = (
	text: string,
	protectText: (value: string) => string,
): string => {
	let result = "";
	let cursor = 0;
	for (const match of text.matchAll(/!?\[([^\]\n]*)\]\(/g)) {
		if (match.index < cursor) {
			continue;
		}

		const destinationStart = match.index + match[0].length;
		let destinationEnd = destinationStart;
		let depth = 1;

		while (destinationEnd < text.length) {
			if (text[destinationEnd] === "(") {
				depth += 1;
			} else if (text[destinationEnd] === ")") {
				depth -= 1;
			}
			if (depth === 0) {
				break;
			}
			destinationEnd += 1;
		}

		const url = text
			.slice(destinationStart, destinationEnd)
			.replace(/\s+["'][\s\S]*$/, "")
			.replace(/^<|>$/g, "");
		result +=
			text.slice(cursor, match.index) +
			match[1] +
			(url ? ` (${protectText(url)})` : "");
		cursor = destinationEnd + (depth === 0 ? 1 : 0);
	}

	return result + text.slice(cursor);
};
