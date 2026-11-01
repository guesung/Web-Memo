import type { IFSentryEventResponse } from "./api";

/** Slack에 싣는 대표 이벤트 요약. 값이 없으면 null(=미수집)입니다. */
export interface IFSentryEventContext {
	eventId: string | null;
	fetchedAt: string;
	environment: string | null;
	release: string | null;
	browser: string | null;
	os: string | null;
	runtime: string | null;
	exception: string | null;
	frames: string[];
	breadcrumbs: string[];
}

const MAX_TEXT_LENGTH = 200;
const MAX_FRAMES = 5;
const MAX_BREADCRUMBS = 5;

/** project slug로 runtime을 추정할 때의 대응. */
const RUNTIME_BY_PROJECT_SLUG: Record<string, string> = {
	"web-memo": "extension",
	"web-memo-web": "web",
};

const SECRET_PATTERNS: RegExp[] = [
	/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
	/Bearer\s+[A-Za-z0-9._~+/=-]+/gi,
	/xox[a-z]-[A-Za-z0-9-]+/g,
	/ghp_[A-Za-z0-9]+/g,
	/\bsk-[A-Za-z0-9_-]{8,}/g,
	/\b[A-Fa-f0-9]{32,}\b/g,
	/\b[A-Za-z0-9+/_-]{40,}={0,2}/g,
];

const URL_PATTERN = /https?:\/\/[^\s"'<>)]+|chrome-extension:\/\/[^\s"'<>)]+/g;

/**
 * 비신뢰 문자열을 Slack에 안전하게 싣도록 정제합니다.
 *
 * @description URL의 query·fragment 제거 → 비밀 패턴 마스킹 → 백틱 치환 →
 * 길이 제한 → mrkdwn 특수문자 이스케이프 순서입니다. 이스케이프를 마지막에 해
 * `&lt;`처럼 늘어난 길이가 잘리며 깨지는 일을 막기 위해 자르기를 먼저 합니다.
 */
export const sanitizeForSlack = (
	value: string,
	maxLength = MAX_TEXT_LENGTH,
): string => {
	let text = value.replace(URL_PATTERN, (url) => url.split(/[?#]/)[0]);

	for (const pattern of SECRET_PATTERNS) {
		text = text.replace(pattern, "[masked]");
	}

	text = text.replace(/`/g, "'").replace(/\s+/g, " ").trim();

	if (text.length > maxLength) {
		text = `${text.slice(0, maxLength)}…`;
	}

	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
};

const clean = (value: unknown): string | null => {
	if (typeof value !== "string" || !value.trim()) return null;

	return sanitizeForSlack(value);
};

/**
 * 이벤트 ID·릴리스처럼 식별자 모양이면 그대로 둡니다. 32자 hex인 이벤트 ID가
 * 토큰 마스킹에 걸려 사라지면 안 되기 때문입니다. 식별자 모양이 아니면 정제합니다.
 */
const IDENTIFIER_PATTERN = /^[A-Za-z0-9._@+-]{1,64}$/;

const cleanIdentifier = (value: unknown): string | null => {
	if (typeof value !== "string" || !value.trim()) return null;

	return IDENTIFIER_PATTERN.test(value) ? value : sanitizeForSlack(value);
};

const joinNameVersion = (context?: { name?: string; version?: string }) => {
	if (!context?.name) return null;

	return clean(
		`${context.name}${context.version ? ` ${context.version}` : ""}`,
	);
};

interface IFFrame {
	filename?: string;
	function?: string;
	lineNo?: number;
	colNo?: number;
	inApp?: boolean;
}

const formatFrame = (frame: IFFrame): string => {
	const location = [frame.filename ?? "?", frame.lineNo, frame.colNo]
		.filter((part) => part !== undefined && part !== null)
		.join(":");

	return sanitizeForSlack(
		frame.function ? `${location} ${frame.function}` : location,
	);
};

/** frames는 오래된 → 최신 순이므로 뒤에서부터 고릅니다. in-app이 있으면 그것만 씁니다. */
const pickFrames = (frames: IFFrame[]): string[] => {
	const inApp = frames.filter((frame) => frame.inApp);
	const source = inApp.length > 0 ? inApp : frames;

	return source.slice(-MAX_FRAMES).reverse().map(formatFrame);
};

/**
 * Sentry 이벤트 응답에서 알림에 쓸 값을 뽑아 정제합니다. 순수 함수입니다.
 *
 * @param projectSlug runtime 태그가 없을 때 추정하는 데 씁니다.
 */
export const extractEventContext = ({
	event,
	projectSlug,
	now = new Date(),
}: {
	event: IFSentryEventResponse;
	projectSlug?: string;
	now?: Date;
}): IFSentryEventContext => {
	const tag = (key: string) =>
		clean(event.tags?.find((entry) => entry.key === key)?.value);

	const releaseRaw =
		typeof event.release === "string" ? event.release : event.release?.version;

	const runtime =
		tag("runtime") ??
		(projectSlug ? (RUNTIME_BY_PROJECT_SLUG[projectSlug] ?? null) : null);

	const entries = event.entries ?? [];
	const exceptionEntry = entries.find((entry) => entry.type === "exception")
		?.data as
		| {
				values?: {
					type?: string;
					value?: string;
					stacktrace?: { frames?: IFFrame[] };
				}[];
		  }
		| undefined;
	const exceptionValues = exceptionEntry?.values ?? [];
	// 마지막 값이 가장 바깥(최종) 예외입니다.
	const lastException = exceptionValues[exceptionValues.length - 1];
	const exception = lastException
		? sanitizeForSlack(
				[lastException.type, lastException.value].filter(Boolean).join(": "),
			) || null
		: null;
	const frames = pickFrames(lastException?.stacktrace?.frames ?? []);

	const breadcrumbEntry = entries.find((entry) => entry.type === "breadcrumbs")
		?.data as
		| {
				values?: {
					category?: string;
					level?: string;
					message?: string;
				}[];
		  }
		| undefined;
	const breadcrumbs = (breadcrumbEntry?.values ?? [])
		.slice(-MAX_BREADCRUMBS)
		.map((crumb) =>
			sanitizeForSlack(
				[crumb.category, crumb.level, crumb.message].filter(Boolean).join(" "),
			),
		)
		.filter(Boolean);

	return {
		eventId: cleanIdentifier(event.eventID),
		fetchedAt: now.toISOString(),
		environment: tag("environment"),
		release: cleanIdentifier(releaseRaw),
		browser: joinNameVersion(event.contexts?.browser) ?? tag("browser"),
		os: joinNameVersion(event.contexts?.os) ?? tag("os"),
		runtime,
		exception,
		frames,
		breadcrumbs,
	};
};
