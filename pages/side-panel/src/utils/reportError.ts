import { captureException } from "@sentry/react";
import {
	createErrorReporter,
	type IFReportErrorParams,
} from "@web-memo/shared/utils";
import { Tab } from "@web-memo/shared/utils/extension";

/** 사이드 패널의 오류 리포터. 요약·채팅·mutation이 같은 중복 억제 기록을 공유한다. */
export const reportSidePanelError = createErrorReporter({
	capture: captureException,
});

/**
 * 활성 탭의 호스트명을 돌려준다.
 *
 * @description URL 전체는 사용자의 열람 기록이라 호스트만 쓴다. 얻지 못하면 `undefined`.
 */
const getActiveTabHost = async (): Promise<string | undefined> => {
	try {
		const tab = await Tab.get();

		if (!tab?.url) {
			return undefined;
		}

		return new URL(tab.url).hostname || undefined;
	} catch {
		return undefined;
	}
};

/**
 * 페이지를 대상으로 하는 기능(요약·채팅)의 실패를 활성 탭의 호스트와 함께 보고한다.
 *
 * @description 특정 사이트에서만 반복되는 실패를 `host` 태그로 걸러 볼 수 있다.
 */
export const reportPageFeatureError = async (
	params: Omit<IFReportErrorParams, "tags">,
): Promise<void> => {
	const host = await getActiveTabHost();

	reportSidePanelError({ ...params, tags: host ? { host } : undefined });
};
