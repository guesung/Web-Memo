import { getPageKey, normalizeUrl } from "@web-memo/shared/utils";

/** 같은 확장의 최상위 문서가 현재 탭 URL에 요청했으면 정규화한 URL을 반환한다. */
export const getValidatedHighlightUrl = (
	sender: chrome.runtime.MessageSender,
	payloadUrl: string,
): string | null => {
	if (
		sender.id !== chrome.runtime.id ||
		sender.tab?.id === undefined ||
		sender.frameId !== 0 ||
		!sender.url ||
		!sender.tab.url
	) {
		return null;
	}

	try {
		const documentUrl = new URL(sender.url);
		/** pushState 이후 sender.url은 최초 문서 URL일 수 있으므로 현재 탭 URL을 기준으로 삼는다. */
		const tabUrl = new URL(sender.tab.url);
		if (
			!["http:", "https:"].includes(tabUrl.protocol) ||
			documentUrl.origin !== tabUrl.origin
		) {
			return null;
		}
		const normalizedTabUrl = normalizeUrl(tabUrl.href);
		if (getPageKey(normalizedTabUrl) !== getPageKey(payloadUrl)) {
			return null;
		}

		return normalizedTabUrl;
	} catch {
		return null;
	}
};
