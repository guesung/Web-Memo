import {
	ANALYTICS_EXCLUDED_USER_ID,
	type HighlightColor,
} from "@web-memo/shared/constants";

/** 세션이 만료되는 무활동 시간(분). 확장과 같은 값이다. */
const SESSION_TIMEOUT_MINUTES = 30;

/** 이벤트 분류. GA4의 event_category로 전송된다. */
export type TAppEventCategory = "engagement" | "core_action";

/**
 * 앱에서 추적하는 이벤트 전체 목록.
 * @description 새 이벤트는 여기에 멤버를 추가하고 APP_EVENT_CATEGORY에도 분류를 넣어야 한다.
 */
export type TAppAnalyticsEvent =
	| {
			name: "page_view";
			params: { page_title: string; page_location: string };
	  }
	| { name: "memo_first_write" }
	| { name: "memo_write"; params: { fields: string } }
	| {
			name: "memo_status_toggle";
			params: {
				status: "wish" | "star" | "reading";
				enabled: boolean;
				/** 공유 인텐트로 저장된 경우에만 실린다. 앱에만 있는 파라미터다. */
				source?: "share_intent";
			};
	  }
	| { name: "memo_delete"; params: { memo_count: number } }
	| { name: "memo_restore"; params: { memo_count: number } }
	| { name: "login"; params: { method: "google" | "kakao" | "apple" } }
	| {
			name: "highlight_create";
			params: { color: HighlightColor; has_note: boolean };
	  };

/** 이벤트 이름별 분류. Record로 강제해 분류가 빠지면 컴파일이 실패한다. */
export const APP_EVENT_CATEGORY: Record<
	TAppAnalyticsEvent["name"],
	TAppEventCategory
> = {
	page_view: "engagement",
	memo_first_write: "core_action",
	memo_write: "core_action",
	memo_status_toggle: "core_action",
	memo_delete: "core_action",
	memo_restore: "core_action",
	login: "core_action",
	highlight_create: "core_action",
};

/**
 * 저장 요청에서 실제로 채운 본문 필드를 memo_write의 fields 형식으로 만든다.
 * @description 웹 memoUpdateEvents와 같이 이름순으로 정렬해 쉼표로 잇는다.
 */
export function buildMemoWriteFields(request: {
	memo?: string;
	title?: string;
	impression?: string | null;
	actionItem?: string | null;
}): string {
	const contentKeys = ["memo", "title", "impression", "actionItem"] as const;

	return contentKeys
		.filter((contentKey) => request[contentKey] !== undefined)
		.sort()
		.join(",");
}

/** 분류별 engagement_time_msec. 공용 Analytics.ts와 같은 값이다. */
const ENGAGEMENT_TIME_MSEC: Record<TAppEventCategory, number> = {
	core_action: 500,
	engagement: 100,
};

/** 모든 이벤트에 공통으로 싣는 환경 값. */
export interface IFAppEnvironment {
	isDevelopment: boolean;
	appVersion: string | undefined;
	platform: string;
}

/** GA4 Measurement Protocol로 보내는 본문. */
export interface IFAppAnalyticsPayload {
	client_id: string;
	user_id?: string;
	events: Array<{ name: string; params: Record<string, unknown> }>;
}

/** 마지막 이벤트로부터 30분이 넘게 지났으면 세션이 만료된 것으로 본다. */
export function isSessionExpired({
	lastEventAt,
	now,
}: {
	lastEventAt: number | null;
	now: number;
}): boolean {
	if (lastEventAt === null) {
		return true;
	}

	return (now - lastEventAt) / 60000 > SESSION_TIMEOUT_MINUTES;
}

/** 이 사용자의 행동을 전송해도 되는지 판단한다. 제외 대상 user_id면 false. */
export function isTrackableUser(userId: string | undefined): boolean {
	return userId !== ANALYTICS_EXCLUDED_USER_ID;
}

/** 개발 빌드에서는 전송하지 않고 콘솔에만 남긴다. */
export function shouldSendEvent(isDevelopment: boolean): boolean {
	return !isDevelopment;
}

/** 이벤트별 파라미터에 공통 파라미터를 얹는다. */
export function buildEventParams({
	event,
	environment,
}: {
	event: TAppAnalyticsEvent;
	environment: IFAppEnvironment;
}): Record<string, unknown> {
	const category = APP_EVENT_CATEGORY[event.name];

	return {
		...("params" in event ? event.params : {}),
		event_category: category,
		engagement_time_msec: ENGAGEMENT_TIME_MSEC[category],
		build_env: environment.isDevelopment ? "development" : "production",
		app_version: environment.appVersion,
		app_platform: environment.platform,
	};
}

/** Measurement Protocol payload를 조립한다. 형태는 확장의 sendEventInExtension과 같다. */
export function buildPayload({
	clientId,
	userId,
	sessionId,
	eventName,
	params,
}: {
	clientId: string;
	userId: string | undefined;
	sessionId: string;
	eventName: string;
	params: Record<string, unknown>;
}): IFAppAnalyticsPayload {
	const payload: IFAppAnalyticsPayload = {
		client_id: clientId,
		events: [{ name: eventName, params: { session_id: sessionId, ...params } }],
	};

	if (userId) {
		payload.user_id = userId;
	}

	return payload;
}
