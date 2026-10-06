import { CONFIG } from "@web-memo/env";
import { ANALYTICS_EXCLUDED_USER_ID } from "../../constants";
import type { MemoTable } from "../../types";
import { isExtension } from "../../utils";
import {
	applyUserIdInWeb,
	getOrCreateClientId,
	sendEvent,
} from "./analyticsTransport";
import {
	buildMemoUpdateEvents,
	type IFMemoUpdateContext,
} from "./memoUpdateEvents";
import {
	EVENT_CATEGORY,
	type IFGa4EventParams,
	type TAnalyticsEvent,
} from "./type";

/** core_action 이벤트의 참여 시간. 사용자가 의도를 갖고 한 동작이라 길게 잡습니다. */
const CORE_ACTION_ENGAGEMENT_TIME_MSEC = 500;
/** engagement 이벤트의 참여 시간. */
const DEFAULT_ENGAGEMENT_TIME_MSEC = 100;

class Analytics {
	private static instance: Analytics;
	private userId: string | undefined = undefined;
	private hasUserIdBeenSet = false;
	private userIdRevision = 0;
	private readonly USER_ID_STORAGE_KEY = "analyticsUserId";

	private constructor() {}

	/**
	 * 이후 이벤트에 실을 user_id를 정합니다.
	 * @description 확장에서는 storage에도 남깁니다. background·content-ui·options는
	 * 사이드패널과 다른 실행 환경이라 이 싱글턴을 공유하지 않고, service worker는
	 * 할 일이 없으면 죽어 메모리에 둔 값이 사라지기 때문입니다.
	 */
	public setUserId(userId: string | undefined): void {
		this.userId = userId;
		this.hasUserIdBeenSet = true;
		this.userIdRevision += 1;

		if (!isExtension()) {
			applyUserIdInWeb(userId);
			return;
		}

		void this.persistUserId(userId);
	}

	/** user_id를 확장 storage에 남깁니다. 로그아웃이면 지웁니다. */
	private async persistUserId(userId: string | undefined): Promise<void> {
		try {
			if (!userId) {
				await chrome.storage.local.remove(this.USER_ID_STORAGE_KEY);
				return;
			}

			await chrome.storage.local.set({ [this.USER_ID_STORAGE_KEY]: userId });
		} catch (_error) {
			console.warn("[analytics] user_id를 storage에 남기지 못했습니다.");
		}
	}

	/**
	 * 전송 시점의 user_id를 얻습니다.
	 * @description 이 컨텍스트에서 setUserId가 불린 적이 없으면 storage에서 보충합니다.
	 * 사이드패널이 열리자마자 나가는 side_panel_open·page_view도 이 경로로 user_id를 얻습니다.
	 * 사용자 조회가 끝나기를 기다리지 않기 때문입니다.
	 */
	private async resolveUserId(): Promise<string | undefined> {
		if (!isExtension() || this.hasUserIdBeenSet) {
			return this.userId;
		}

		const userIdRevisionBeforeStorageRead = this.userIdRevision;

		try {
			const result = await chrome.storage.local.get(this.USER_ID_STORAGE_KEY);
			if (this.userIdRevision !== userIdRevisionBeforeStorageRead) {
				return this.userId;
			}

			return result[this.USER_ID_STORAGE_KEY];
		} catch (_error) {
			if (this.userIdRevision !== userIdRevisionBeforeStorageRead) {
				return this.userId;
			}

			console.warn("[analytics] user_id를 storage에서 읽지 못했습니다.");

			return undefined;
		}
	}

	/**
	 * 확장에서 웹으로 넘길 client_id를 얻습니다. 확장 컨텍스트가 아니면 undefined입니다.
	 * @description 웹은 이 값을 `_ga` 쿠키로 이어받아(apps/web 루트 레이아웃) 확장과 같은 사용자로 집계됩니다.
	 */
	public async getExtensionClientId(): Promise<string | undefined> {
		if (!isExtension()) {
			return undefined;
		}

		return getOrCreateClientId();
	}

	public static getInstance(): Analytics {
		if (!Analytics.instance) {
			Analytics.instance = new Analytics();
		}
		return Analytics.instance;
	}

	/**
	 * GA4로 이벤트를 전송할지 여부.
	 * 개발 빌드는 보내지 않습니다. staging은 테섭에서 실제 도착을 확인해야 하므로 보냅니다.
	 * @description 만든 사람 본인의 행동도 보내지 않습니다. 다만 이 게이트는 커스텀 이벤트만
	 * 막습니다. gtag가 자동으로 보내는 page_view·session_start는 여기를 지나지 않으므로
	 * 웹 레이아웃에서 따로 막습니다.
	 */
	private shouldSend(userId: string | undefined): boolean {
		if (userId === ANALYTICS_EXCLUDED_USER_ID) {
			return false;
		}

		return CONFIG.buildEnv !== "development";
	}

	/**
	 * 콘솔에 이벤트를 찍을지 여부.
	 * 개발과 staging에서 켜집니다. 로깅이 나갔는지 눈으로 확인할 수 있는 유일한 수단입니다.
	 */
	private shouldLogToConsole(): boolean {
		return CONFIG.buildEnv !== "production";
	}

	/** staging에서만 참. GA4 DebugView에 실시간으로 표시되게 합니다. */
	private isDebugMode(): boolean {
		return CONFIG.buildEnv === "staging";
	}

	async trackEvent(event: TAnalyticsEvent): Promise<void> {
		const parameters = this.buildParameters(event);

		if (this.shouldLogToConsole()) {
			console.info(`[analytics] ${event.name}`, parameters);
		}

		const userId = await this.resolveUserId();
		if (!this.shouldSend(userId)) {
			return;
		}

		await sendEvent({ eventName: event.name, parameters, userId });
	}

	/**
	 * 이벤트별 파라미터에 모든 이벤트가 공유하는 값을 얹습니다.
	 * @description 호출부가 매번 적지 않게 여기서 한 번에 붙입니다. 빠뜨리는 곳이 생기지 않게 하는 게 목적입니다.
	 */
	private buildParameters(event: TAnalyticsEvent): IFGa4EventParams {
		const eventCategory = EVENT_CATEGORY[event.name];

		return {
			...("params" in event ? event.params : {}),
			event_category: eventCategory,
			engagement_time_msec:
				eventCategory === "core_action"
					? CORE_ACTION_ENGAGEMENT_TIME_MSEC
					: DEFAULT_ENGAGEMENT_TIME_MSEC,
			build_env: CONFIG.buildEnv,
			...(this.isDebugMode() ? { debug_mode: true as const } : {}),
			...(isExtension()
				? { extension_version: chrome.runtime.getManifest().version }
				: {}),
		};
	}

	public async trackSidePanelOpen(): Promise<void> {
		await this.trackEvent({ name: "side_panel_open" });
	}

	/**
	 * 메모 변경 요청의 키를 보고 무엇을 바꿨는지 가려 기록합니다.
	 * @description 상태 토글·카테고리·본문 수정이 전부 같은 뮤테이션을 지나므로, 호출부마다
	 * 심는 대신 여기서 한 번 가릅니다. 예전 memo_write는 이 셋을 한 덩어리로 세서 어느
	 * 필드가 실제로 쓰이는지 알 수 없었습니다.
	 */
	public async trackMemoUpdate(
		request: Partial<MemoTable["Update"]>,
		context?: IFMemoUpdateContext,
	): Promise<void> {
		for (const event of buildMemoUpdateEvents(request, context)) {
			await this.trackEvent(event);
		}
	}

	public async trackPageView(
		pageTitle: string,
		pageLocation: string,
	): Promise<void> {
		await this.trackEvent({
			name: "page_view",
			params: { page_title: pageTitle, page_location: pageLocation },
		});
	}
}

/**
 * GA4 이벤트 전송 진입점.
 * @description 웹은 gtag, 확장은 Measurement Protocol로 나가지만 호출부는 그 차이를 몰라도 됩니다.
 * 빌드 환경에 따라 전송 여부와 콘솔 출력이 갈립니다. 환경별 동작은 Analytics.test.ts를 보세요.
 */
export const analytics = Analytics.getInstance();
