// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import useSummary from ".";

const mocks = vi.hoisted(() => ({
	page: {
		pageKey: "1:https://example.com/first",
		content: "first page",
		category: "others" as const,
		isLoading: false,
		error: "",
	},
	user: { data: { user: { id: "user-1" } } } as
		| { data: { user: { id: string } | null } }
		| undefined,
	trackEvent: vi.fn(),
	stream: vi.fn(),
}));

vi.mock("../../components/PageContentProvider", () => ({
	usePageContentContext: () => mocks.page,
}));
vi.mock("@web-memo/env", () => ({
	CONFIG: { webUrl: "https://webmemo.test" },
}));
vi.mock("@tanstack/react-query", () => ({
	skipToken: Symbol("skipToken"),
	useQuery: (options: { queryKey: string[] }) => ({
		data: options.queryKey[0] === "user" ? mocks.user : {},
	}),
}));
vi.mock("@web-memo/shared/hooks", () => ({
	supabaseClientQueryOptions: () => ({ queryKey: ["client"] }),
	userQueryOptions: () => ({ queryFn: vi.fn() }),
}));
vi.mock("@web-memo/shared/constants", () => ({
	QUERY_KEY: { user: () => ["user"] },
}));
vi.mock("@web-memo/shared/modules/analytics", () => ({
	analytics: { trackEvent: mocks.trackEvent },
}));
vi.mock("@web-memo/shared/utils/extension", () => ({
	I18n: { get: (key: string) => key },
}));
vi.mock("@web-memo/shared/utils", () => ({
	isAbortError: (error: unknown) =>
		error instanceof Error && error.name === "AbortError",
}));
vi.mock("../../utils", () => ({ reportPageFeatureError: vi.fn() }));
vi.mock("./util", () => ({
	getSummaryPrompt: async () => [{ role: "user", content: "first page" }],
	processStreamingResponse: mocks.stream,
}));

let root: Root;
let summary: ReturnType<typeof useSummary>;
const Probe = () => {
	summary = useSummary();
	return null;
};
const render = async () => {
	await act(async () => root.render(createElement(Probe)));
};

beforeEach(() => {
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	mocks.page = {
		pageKey: "1:https://example.com/first",
		content: "first page",
		category: "others",
		isLoading: false,
		error: "",
	};
	mocks.user = { data: { user: { id: "user-1" } } };
	mocks.trackEvent.mockReset();
	mocks.stream.mockReset();
	document.body.innerHTML = '<div id="root"></div>';
	root = createRoot(document.getElementById("root") as HTMLElement);
});

afterEach(async () => {
	await act(async () => root.unmount());
	vi.unstubAllGlobals();
});

it("인증 확인 전에는 요약 요청을 보내지 않는다", async () => {
	mocks.user = undefined;
	const fetchMock = vi.fn();
	vi.stubGlobal("fetch", fetchMock);
	await render();
	await act(async () => summary.generateSummary("empty_state"));
	expect(fetchMock).not.toHaveBeenCalled();
	expect(mocks.trackEvent).not.toHaveBeenCalled();
});

it("중복 클릭을 막고 페이지 변경 후 이전 스트림 조각을 무시한다", async () => {
	let onChunk!: (content: string) => void;
	let resolveStream!: () => void;
	mocks.stream.mockImplementation(
		(_response: Response, callback: (content: string) => void) => {
			onChunk = callback;
			return new Promise<void>((resolve) => {
				resolveStream = resolve;
			});
		},
	);
	const fetchMock = vi.fn().mockResolvedValue({ ok: true });
	vi.stubGlobal("fetch", fetchMock);
	await render();
	let request!: Promise<void>;
	await act(async () => {
		request = summary.generateSummary("empty_state");
		void summary.generateSummary("empty_state");
		await Promise.resolve();
	});
	expect(fetchMock).toHaveBeenCalledTimes(1);
	expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);

	await act(async () => onChunk("current"));
	expect(summary.summary).toBe("current");
	mocks.page = { ...mocks.page, pageKey: "2:https://example.com/second" };
	await render();
	expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
	await act(async () => onChunk("old"));
	expect(summary.summary).toBe("");
	await act(async () => resolveStream());
	await request;
});

it("완료된 요약은 A→B→A 이동 후 다시 나타나지 않는다", async () => {
	mocks.stream.mockImplementation(
		async (_response: Response, onChunk: (content: string) => void) => {
			onChunk("A summary");
		},
	);
	vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
	await render();
	await act(async () => summary.generateSummary("empty_state"));
	expect(summary.summary).toBe("A summary");

	mocks.page = { ...mocks.page, pageKey: "2:https://example.com/second" };
	await render();
	expect(summary.summary).toBe("");
	mocks.page = { ...mocks.page, pageKey: "1:https://example.com/first" };
	await render();
	expect(summary.summary).toBe("");
	expect(summary.isSummaryLoading).toBe(false);
});
