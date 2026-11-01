// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { QUERY_KEY } from "@web-memo/shared/constants";
import { act, createElement, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
	getPageKey,
	getPathKey,
} from "../../../../../../../../packages/shared/src/utils/Url";
import useMemoEditorReady from "./useMemoEditorReady";

const trackEvent = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("@web-memo/shared/modules/analytics", () => ({
	analytics: { trackEvent },
}));
vi.mock(
	"@web-memo/shared/utils",
	async () => import("../../../../../../../../packages/shared/src/utils/Url"),
);
let root: Root;
let queryClient: QueryClient;
let isVisible: boolean;
let hasRect: boolean;
let props: {
	userId: string | undefined;
	tab: { id?: number; url?: string };
	isMemoLocked: boolean;
	isMemoLoadFailed: boolean;
};
const TestEditor = () => {
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	useMemoEditorReady({ ...props, textareaRef });
	return createElement("textarea", { ref: textareaRef });
};
const render = async () => {
	await act(async () =>
		root.render(
			createElement(
				QueryClientProvider,
				{ client: queryClient },
				createElement(TestEditor),
			),
		),
	);
};
const loadCandidates = (url = props.tab.url ?? "") => {
	queryClient.setQueryData(QUERY_KEY.memo({ url: getPageKey(url) }), {
		data: [],
		error: null,
	});
	queryClient.setQueryData(QUERY_KEY.samePathMemos(getPathKey(url)), {
		data: [],
		error: null,
	});
};
const visibilityChange = async () => {
	await act(async () => document.dispatchEvent(new Event("visibilitychange")));
};

beforeEach(() => {
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	vi.stubGlobal(
		"ResizeObserver",
		class {
			observe() {}
			disconnect() {}
		},
	);
	vi.spyOn(document, "visibilityState", "get").mockImplementation(() =>
		isVisible ? "visible" : "hidden",
	);
	vi.spyOn(HTMLElement.prototype, "getClientRects").mockImplementation(() =>
		hasRect
			? ([{ width: 300, height: 100 }] as unknown as DOMRectList)
			: ([] as unknown as DOMRectList),
	);
	isVisible = true;
	hasRect = true;
	trackEvent.mockReset().mockResolvedValue(undefined);
	props = {
		userId: "user-1",
		tab: { id: 1, url: "https://example.com/a" },
		isMemoLocked: false,
		isMemoLoadFailed: false,
	};
	queryClient = new QueryClient();
	document.body.innerHTML = "<div id='root'></div>";
	root = createRoot(document.getElementById("root") as HTMLElement);
});
afterEach(async () => {
	await act(async () => root.unmount());
	queryClient.clear();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

it("두 후보 조회가 성공한 실제 입력 가능 화면에서만 한 번 시도한다", async () => {
	await render();
	expect(trackEvent).not.toHaveBeenCalled();
	await act(async () =>
		queryClient.setQueryData(QUERY_KEY.memo({ url: props.tab.url }), {
			data: [],
			error: null,
		}),
	);
	expect(trackEvent).not.toHaveBeenCalled();
	await act(async () => loadCandidates());
	expect(trackEvent).toHaveBeenCalledTimes(1);
	expect(trackEvent).toHaveBeenCalledWith(
		{ name: "memo_editor_ready", params: { source: "side_panel" } },
		"user-1",
	);
	await render();
	await visibilityChange();
	await act(async () => loadCandidates());
	expect(trackEvent).toHaveBeenCalledTimes(1);
});

it.each([
	"login",
	"locked",
	"error",
	"hidden",
	"zeroRect",
	"readonly",
	"disabled",
])("%s 상태에서는 준비 이벤트가 없고 해제 뒤 재평가한다", async (condition) => {
	loadCandidates();
	if (condition === "login") props.userId = undefined;
	if (condition === "locked") props.isMemoLocked = true;
	if (condition === "error") props.isMemoLoadFailed = true;
	if (condition === "hidden") isVisible = false;
	if (condition === "zeroRect") hasRect = false;
	if (condition === "readonly" || condition === "disabled") isVisible = false;
	await render();
	const textarea = document.querySelector("textarea");
	if (!textarea) throw new Error("Missing editor");
	if (condition === "readonly") textarea.readOnly = true;
	if (condition === "disabled") textarea.disabled = true;
	if (condition === "readonly" || condition === "disabled") {
		isVisible = true;
		await visibilityChange();
	}
	expect(trackEvent).not.toHaveBeenCalled();
	props.userId = "user-1";
	props.isMemoLocked = false;
	props.isMemoLoadFailed = false;
	isVisible = true;
	hasRect = true;
	textarea.readOnly = false;
	textarea.disabled = false;
	await render();
	await visibilityChange();
	expect(trackEvent).toHaveBeenCalledTimes(1);
});

it("후보 오류 응답은 제외하고 새 페이지·탭·사용자를 각각 재평가한다", async () => {
	loadCandidates();
	queryClient.setQueryData(
		QUERY_KEY.samePathMemos(getPathKey("https://example.com/a")),
		{
			error: { message: "failed" },
		},
	);
	await render();
	expect(trackEvent).not.toHaveBeenCalled();
	await act(async () => loadCandidates());
	props.tab = { id: 1, url: "https://example.com/b" };
	loadCandidates();
	await render();
	props.tab = { id: 2, url: "https://example.com/b" };
	await render();
	props.userId = "user-2";
	await render();
	expect(trackEvent).toHaveBeenCalledTimes(4);
	props = {
		...props,
		userId: "user-1",
		tab: { id: 1, url: "https://example.com/a" },
	};
	await render();
	expect(trackEvent).toHaveBeenCalledTimes(4);
});

it("계측 거절은 입력을 잠그거나 같은 범위 재시도를 만들지 않는다", async () => {
	trackEvent.mockRejectedValue(new Error("analytics failed"));
	loadCandidates();
	await render();
	await visibilityChange();
	expect(document.querySelector("textarea")?.readOnly).toBe(false);
	expect(trackEvent).toHaveBeenCalledTimes(1);
});

it("추적 파라미터와 fragment는 실제 후보 캐시의 정규화한 페이지 키로 확인한다", async () => {
	props.tab.url = "https://example.com/a?utm_source=test#part";
	loadCandidates();
	await render();
	expect(trackEvent).toHaveBeenCalledTimes(1);
	props.tab.url = "https://example.com/a#next";
	await render();
	expect(trackEvent).toHaveBeenCalledTimes(1);
});

it("유효하지 않은 탭 URL은 제외한다", async () => {
	props.tab.url = "not a URL";
	await render();
	expect(trackEvent).not.toHaveBeenCalled();
});
