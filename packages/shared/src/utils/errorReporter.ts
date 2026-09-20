/** 수집기에 넘기는 심각도. Sentry의 SeverityLevel 중 이 프로젝트가 쓰는 값만 둔다. */
export type TErrorReportLevel = "fatal" | "error" | "warning" | "info";

/** 수집기에 넘기는 컨텍스트. Sentry의 `captureException` 두 번째 인자와 호환된다. */
export interface IFErrorReportContext {
	level: TErrorReportLevel;
	tags: Record<string, string>;
	fingerprint: string[];
	extra: Record<string, unknown>;
}

/** 오류를 수집기로 보내는 함수. 확장은 `@sentry/react`, 웹은 `@sentry/nextjs`의 `captureException`을 넘긴다. */
export type TCaptureError = (
	error: Error,
	context: IFErrorReportContext,
) => unknown;

/** 오류 한 건을 보고할 때 넘기는 값. */
export interface IFReportErrorParams {
	error: unknown;
	/** 기능 이름. 예: `summary`, `highlight` */
	feature: string;
	/** 기능 안의 동작. 예: `generate`, `create` */
	operation: string;
	/** 실패한 단계. 예: `fetch`, `insert` */
	stage: string;
	/** 기본값은 `error`. */
	level?: TErrorReportLevel;
	/** 이슈 그룹에는 영향이 없고 필터링에만 쓰는 추가 태그. 예: `host` */
	tags?: Record<string, string>;
	extra?: Record<string, unknown>;
	/** 켜면 메시지까지 같은 오류만 한 이슈로 묶는다. 기능·단계 태그가 없는 오류에 쓴다. */
	groupByMessage?: boolean;
}

const DEDUPE_WINDOW_MS = 8_000;
const MESSAGE_KEY_LENGTH = 120;
const PRUNE_THRESHOLD = 100;

/** `Error`가 아니어도 `message`를 가진 객체(Supabase의 오류 객체 등)에서 메시지를 꺼낸다. */
const getMessage = (error: unknown): string => {
	if (typeof error === "object" && error !== null && "message" in error) {
		const { message } = error;

		if (typeof message === "string") {
			return message;
		}
	}

	return String(error);
};

/**
 * 이슈 제목에 기능·동작·단계가 보이도록 오류를 감싼다.
 *
 * @description Sentry 웹훅(issue 리소스)은 태그를 싣지 않아, Slack 알림에서 어디서 깨졌는지는
 * 제목으로만 알 수 있다. 원본을 직접 고치지 않는 이유는 호출부가 보고 직후 `error.message`를
 * 사용자 응답에 그대로 쓰기 때문이다. 원본은 `cause`로 남겨 스택을 잃지 않는다.
 */
const labelError = ({
	error,
	messageKey,
	feature,
	operation,
	stage,
}: {
	error: unknown;
	messageKey: string;
	feature: string;
	operation: string;
	stage: string;
}): Error => {
	const original = error instanceof Error ? error : new Error(messageKey);
	const labeled = new Error(
		`[${feature}/${operation}/${stage}] ${original.message}`,
		{ cause: original },
	);

	labeled.name = original.name;
	// Sentry는 이슈의 위치를 보고된 오류의 스택에서 읽는다. 감싼 오류의 스택은 리포터 안을
	// 가리키므로 원본의 스택을 물려줘 실제로 던진 위치가 culprit이 되게 한다.
	labeled.stack = original.stack;

	return labeled;
};

/**
 * 사용자가 취소해서 생긴 오류인지 판별한다.
 *
 * @description 요청 취소는 장애가 아니므로 보고하지 않고, 화면에도 실패로 표시하지 않는다.
 */
export const isAbortError = (error: unknown): boolean => {
	if (!(error instanceof Error)) {
		return false;
	}

	return error.name === "AbortError" || error.name === "CanceledError";
};

/**
 * 로그아웃 상태에서 정상적으로 나오는 인증 오류인지 판별한다.
 *
 * @description 세션이 없는 사용자는 `getUser()`가 `AuthSessionMissingError`를 값으로 돌려주고,
 * 확장의 `getSupabaseClient`는 "로그인을 먼저 해주세요"를 던진다. 장애가 아니라 예상된 상태라
 * 보고하면 Sentry가 로그아웃 사용자 수만큼 쌓인다.
 */
export const isLoggedOutError = (error: unknown): boolean => {
	if (error instanceof Error && error.name === "AuthSessionMissingError") {
		return true;
	}

	const message = getMessage(error);

	return (
		message.includes("Auth session missing") ||
		message.includes("로그인을 먼저 해주세요")
	);
};

/**
 * 성공으로 끝난 쿼리·mutation의 결과(무한 쿼리는 페이지별 결과)에서 값으로 담긴 오류를 꺼낸다.
 *
 * @description Supabase는 네트워크·HTTP 실패를 던지지 않고 `{ data: null, error }`로 돌려주므로
 * React Query는 이를 성공으로 취급한다. `message`를 가진 `error`만 오류로 보고, 로그아웃 상태의
 * 인증 오류는 제외한다. 오류가 없으면 `null`을 돌려준다.
 */
export const getResultError = (result: unknown): unknown => {
	if (typeof result !== "object" || result === null) {
		return null;
	}

	// 무한 쿼리의 결과는 `{ pages }` 안에 페이지별 결과가 들어 있다.
	if ("pages" in result && Array.isArray(result.pages)) {
		for (const page of result.pages) {
			const pageError = getResultError(page);

			if (pageError) {
				return pageError;
			}
		}

		return null;
	}

	if (!("error" in result)) {
		return null;
	}

	const resultError = result.error;

	if (typeof resultError !== "object" || resultError === null) {
		return null;
	}

	if (!("message" in resultError) || isLoggedOutError(resultError)) {
		return null;
	}

	return resultError;
};

/**
 * 오류 수집기로 보내는 규칙을 한곳에 모은 리포터를 만든다.
 *
 * @description 같은 기능·단계·메시지의 오류가 8초 안에 반복되면 한 번만 보내고,
 * 취소 오류(`AbortError`)는 보내지 않는다. 중복 억제 기록은 리포터마다 따로 갖는다.
 * 보냈으면 `true`, 걸러냈으면 `false`를 돌려준다.
 */
export const createErrorReporter = ({
	capture,
}: {
	capture: TCaptureError;
}) => {
	const lastReportedAt = new Map<string, number>();

	return ({
		error,
		feature,
		operation,
		stage,
		level = "error",
		tags,
		extra,
		groupByMessage = false,
	}: IFReportErrorParams): boolean => {
		if (isAbortError(error)) {
			return false;
		}

		const message = getMessage(error);
		const messageKey =
			message.slice(0, MESSAGE_KEY_LENGTH) || "error-without-message";
		const dedupeKey = `${feature}|${operation}|${stage}|${messageKey}`;
		const now = Date.now();
		const lastTime = lastReportedAt.get(dedupeKey);

		if (lastTime !== undefined && now - lastTime < DEDUPE_WINDOW_MS) {
			return false;
		}

		lastReportedAt.set(dedupeKey, now);

		if (lastReportedAt.size > PRUNE_THRESHOLD) {
			for (const [key, time] of lastReportedAt) {
				if (now - time >= DEDUPE_WINDOW_MS) {
					lastReportedAt.delete(key);
				}
			}
		}

		capture(labelError({ error, messageKey, feature, operation, stage }), {
			level,
			tags: { feature, operation, stage, ...tags },
			fingerprint: groupByMessage
				? [feature, operation, stage, messageKey]
				: [feature, operation, stage],
			extra: { occurredAt: now, ...extra },
		});

		return true;
	};
};
