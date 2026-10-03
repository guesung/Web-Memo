import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	setFailureReporter: vi.fn(),
	setHandlerErrorReporter: vi.fn(),
	reportContentUiBridgeFailure: vi.fn(),
	reportContentUiError: vi.fn(),
}));

vi.mock("@web-memo/shared/modules/analytics", () => ({
	analytics: { trackEvent: vi.fn() },
}));
vi.mock("@web-memo/shared/modules/extension-bridge", () => ({
	bridge: {
		setFailureReporter: mocks.setFailureReporter,
		setHandlerErrorReporter: mocks.setHandlerErrorReporter,
		handle: { PAGE_CONTENT: vi.fn(), YOUTUBE_TRANSCRIPT: vi.fn() },
	},
}));
vi.mock("./ui", () => ({
	extractYoutubeTranscript: vi.fn(),
	isYoutubePage: vi.fn(),
	renderOpenSidePanelButton: vi.fn(),
	setupHighlightRestore: vi.fn(),
}));
vi.mock("./utils/reportError", () => ({
	reportContentUiBridgeFailure: mocks.reportContentUiBridgeFailure,
	reportContentUiError: mocks.reportContentUiError,
}));

import "./index";

describe("content-ui 브리지 리포터 연결", () => {
	it("최종 전송 실패를 전용 스코프 breadcrumb 리포터에 연결한다", () => {
		expect(mocks.setFailureReporter).toHaveBeenCalledWith(
			mocks.reportContentUiBridgeFailure,
		);
	});

	it("수신 핸들러 오류를 전용 스코프 오류 리포터에 전달한다", () => {
		const error = new Error("Handler rejected");
		expect(mocks.setHandlerErrorReporter).toHaveBeenCalledOnce();

		mocks.setHandlerErrorReporter.mock.calls[0][0](error);

		expect(mocks.reportContentUiError).toHaveBeenCalledWith({
			error,
			feature: "extension-bridge",
			operation: "handle",
			stage: "listener",
		});
	});
});
