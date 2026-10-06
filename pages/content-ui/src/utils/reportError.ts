import {
	BrowserClient,
	defaultStackParser,
	linkedErrorsIntegration,
	makeFetchTransport,
	Scope,
} from "@sentry/react";
import { SENTRY } from "@web-memo/shared/constants";
import {
	createErrorReporter,
	type IFErrorReportContext,
	isProduction,
} from "@web-memo/shared/utils";

let contentUiScope: Scope | null = null;

/**
 * content script 전용 Sentry 스코프를 처음 보고할 때 한 번만 만든다.
 *
 * @description `init`은 content script에서 SDK가 스스로 꺼 버리고, 켜지더라도 전역 핸들러가
 * 호스트 페이지의 오류까지 수집한다. 그래서 공식 권장대로 전역 통합 없이 클라이언트와 스코프를
 * 직접 만든다. 모든 페이지에 주입되는 코드라 보고할 일이 생기기 전에는 만들지 않는다.
 */
const getContentUiScope = (): Scope => {
	if (contentUiScope) {
		return contentUiScope;
	}

	const client = new BrowserClient({
		dsn: SENTRY.dsnExtension,
		release: chrome.runtime.getManifest().version,
		transport: makeFetchTransport,
		stackParser: defaultStackParser,
		// 리포터가 원본 오류를 `cause`로 감싸므로 연결된 오류만 펼친다.
		// 호스트 페이지의 URL·이벤트를 싣는 통합(HttpContext·Breadcrumbs·GlobalHandlers)은 넣지 않는다.
		integrations: [linkedErrorsIntegration()],
		// 켜 두면 호스트 문서에 visibilitychange 리스너를 단다.
		sendClientReports: false,
	});
	const scope = new Scope();

	scope.setClient(client);
	client.init();
	contentUiScope = scope;

	return scope;
};

const captureContentUiError = (error: Error, context: IFErrorReportContext) => {
	// 확장이 업데이트되면 열려 있던 탭의 content script는 `chrome.runtime.id`를 잃는다.
	// 이때의 요청 실패는 예정된 것이고 매니페스트도 못 읽으므로 보내지 않는다.
	if (!isProduction() || !chrome.runtime?.id) {
		return;
	}

	// `Scope.captureException`의 두 번째 인자는 EventHint라 컨텍스트는 `captureContext`로 넘긴다.
	getContentUiScope().captureException(error, { captureContext: context });
};

/** content script(하이라이트)의 오류 리포터. 개발 빌드에서는 보내지 않는다. */
export const reportContentUiError = createErrorReporter({
	capture: captureContentUiError,
});
