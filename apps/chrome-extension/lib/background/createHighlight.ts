import { HIGHLIGHT_COLORS } from "@web-memo/shared/constants";
import type {
	IFCreateHighlightPayload,
	TCreateHighlightResponse,
} from "@web-memo/shared/modules/extension-bridge";
import { HighlightService, normalizeUrl } from "@web-memo/shared/utils";
import {
	getSupabaseClient,
	SupabaseSessionRequiredError,
} from "@web-memo/shared/utils/extension";
import { reportBackgroundError } from "./reportBackgroundError";

/** 신뢰할 수 없는 메시지 본문과 Chrome이 제공하는 발신 문서 정보. */
interface IFCreateHighlightRequest {
	payload: unknown;
	sender: chrome.runtime.MessageSender;
}

/** 발신 문서의 URL과 입력 범위를 검증하고 인증된 사용자의 하이라이트를 저장한다. */
export const handleCreateHighlight = async (
	request: IFCreateHighlightRequest,
): Promise<TCreateHighlightResponse> => {
	const { payload, sender } = request;
	if (
		!isValidPayload(payload) ||
		sender.id !== chrome.runtime.id ||
		sender.tab?.id === undefined ||
		sender.frameId !== 0 ||
		!sender.url ||
		!sender.tab.url
	) {
		return { success: false, error: "invalid_request" };
	}
	let operation: THighlightSaveOperation | null = null;
	try {
		const documentUrl = new URL(sender.url);
		/** Chrome은 pushState 이후 sender.url을 최초 문서 URL로 유지하므로 현재 탭 URL을 기준으로 삼는다. */
		const senderUrl = new URL(sender.tab.url);
		if (
			!["http:", "https:"].includes(senderUrl.protocol) ||
			documentUrl.origin !== senderUrl.origin ||
			normalizeUrl(senderUrl.href) !== normalizeUrl(new URL(payload.url).href)
		) {
			return { success: false, error: "invalid_request" };
		}
		operation = "client_initialize";
		const supabaseClient = await getAuthenticatedClient();
		if (!supabaseClient) {
			logHighlightFailure(operation, "session_missing");
			return { success: false, error: "unauthenticated" };
		}
		operation = "auth_verify";
		const { data: authData, error: authError } =
			await supabaseClient.auth.getUser();
		if (authError && authError.status !== 401 && authError.status !== 403) {
			logHighlightFailure(operation, "auth_unavailable");
			return { success: false, error: "save_failed" };
		}
		if (authError || !authData.user) {
			logHighlightFailure(
				operation,
				authError ? "auth_rejected" : "user_missing",
			);
			return { success: false, error: "unauthenticated" };
		}
		operation = "insert";
		const service = new HighlightService(supabaseClient);
		const { data, error } = await service.insertHighlight({
			user_id: authData.user.id,
			url: normalizeUrl(senderUrl.href),
			title: payload.title,
			favIconUrl: payload.favIconUrl,
			exact_text: payload.anchor.exact,
			prefix_text: payload.anchor.prefix,
			suffix_text: payload.anchor.suffix,
			text_position_start: payload.anchor.textPositionStart,
			color: payload.color,
		});
		if (error || !data?.[0]) {
			logHighlightFailure(operation, error ? "database_error" : "empty_result");
			return { success: false, error: "save_failed" };
		}

		return { success: true, highlight: data[0] };
	} catch {
		if (!operation) {
			return { success: false, error: "invalid_request" };
		}
		logHighlightFailure(operation, "unexpected_error");
		return { success: false, error: "save_failed" };
	}
};

/** 문자열과 앵커의 크기를 제한해 다른 내부 메시지 발신자도 저장 계약을 우회하지 못하게 한다. */
const isValidPayload = (
	payload: unknown,
): payload is IFCreateHighlightPayload => {
	if (!payload || typeof payload !== "object") {
		return false;
	}
	const input = payload as Partial<IFCreateHighlightPayload>;
	const anchor = input.anchor;

	return (
		typeof input.url === "string" &&
		input.url.length <= 8192 &&
		typeof input.title === "string" &&
		input.title.length <= 2000 &&
		typeof input.favIconUrl === "string" &&
		input.favIconUrl.length <= 8192 &&
		HIGHLIGHT_COLORS.some((color) => color === input.color) &&
		!!anchor &&
		typeof anchor.exact === "string" &&
		anchor.exact.trim().length >= 3 &&
		anchor.exact.length <= 5000 &&
		typeof anchor.prefix === "string" &&
		anchor.prefix.length <= 32 &&
		typeof anchor.suffix === "string" &&
		anchor.suffix.length <= 32 &&
		Number.isSafeInteger(anchor.textPositionStart) &&
		anchor.textPositionStart >= 0
	);
};

/** 기존 클라이언트 초기화는 쿠키가 없으면 예외를 던진다. 로그인 안내로 변환한다. */
export const getAuthenticatedClient = async () => {
	try {
		return await getSupabaseClient();
	} catch (error) {
		if (error instanceof SupabaseSessionRequiredError) {
			return null;
		}
		throw error;
	}
};

/** 진단에 허용하는 저장 단계. URL 검증은 외부 입력이므로 기록하지 않는다. */
type THighlightSaveOperation = "client_initialize" | "auth_verify" | "insert";

/** 서버 메시지와 사용자 데이터를 포함하지 않는 고정 진단 코드. */
type THighlightFailureCode =
	| "session_missing"
	| "auth_unavailable"
	| "auth_rejected"
	| "user_missing"
	| "database_error"
	| "empty_result"
	| "unexpected_error";

/** 로그인 상태나 세션 만료처럼 정상적으로 나오는 코드는 보고하지 않는다. */
const REPORTABLE_FAILURE_CODES: readonly THighlightFailureCode[] = [
	"auth_unavailable",
	"database_error",
	"empty_result",
	"unexpected_error",
];

/**
 * 콘솔과 Sentry에는 코드에서 결정한 단계와 코드만 남기고 오류 객체를 전달하지 않는다.
 *
 * @description 서버 메시지·URL·선택한 텍스트가 섞이지 않도록 고정 문자열로 만든 오류만 보낸다.
 */
const logHighlightFailure = (
	operation: THighlightSaveOperation,
	code: THighlightFailureCode,
) => {
	console.warn("[Web Memo] highlight_save_failed", { operation, code });

	if (!REPORTABLE_FAILURE_CODES.includes(code)) {
		return;
	}

	reportBackgroundError({
		error: new Error(`highlight_save_failed: ${operation}/${code}`),
		feature: "highlight",
		operation: "create",
		stage: `${operation}_${code}`,
	});
};
