// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import PageContentProvider, {
	usePageContentContext,
} from "./PageContentProvider";

const mocks = vi.hoisted(() => ({
	tab: { id: 1, url: "https://example.com/first" },
	dataUpdatedAt: 1,
	request: vi.fn(),
}));

vi.mock("@web-memo/shared/hooks", () => ({
	useTabQuery: () => ({
		data: mocks.tab,
		dataUpdatedAt: mocks.dataUpdatedAt,
		isLoading: false,
	}),
}));
vi.mock("@web-memo/shared/modules/extension-bridge", () => ({
	bridge: { request: { PAGE_CONTENT: mocks.request } },
}));

let root: Root;
let pageContent: ReturnType<typeof usePageContentContext>;
const deferred = () => {
	let resolve!: (value: { content: string; category: "others" }) => void;
	const promise = new Promise<{ content: string; category: "others" }>(
		(done) => {
			resolve = done;
		},
	);
	return { promise, resolve };
};
const Probe = () => {
	pageContent = usePageContentContext();
	return null;
};
const render = async () => {
	await act(async () => {
		root.render(createElement(PageContentProvider, null, createElement(Probe)));
	});
};

beforeEach(() => {
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	mocks.tab = { id: 1, url: "https://example.com/first" };
	mocks.dataUpdatedAt = 1;
	mocks.request.mockReset();
	document.body.innerHTML = '<div id="root"></div>';
	root = createRoot(document.getElementById("root") as HTMLElement);
});

afterEach(async () => {
	await act(async () => root.unmount());
	vi.unstubAllGlobals();
});

it("페이지가 바뀌면 이전 본문을 숨기고 늦은 응답을 무시한다", async () => {
	const first = deferred();
	const second = deferred();
	mocks.request
		.mockReturnValueOnce(first.promise)
		.mockReturnValueOnce(second.promise);
	await render();
	expect(pageContent.isLoading).toBe(true);

	mocks.tab = { id: 2, url: "https://example.com/second" };
	await render();
	expect(pageContent.content).toBe("");
	expect(pageContent.isLoading).toBe(true);

	await act(async () => first.resolve({ content: "old", category: "others" }));
	expect(pageContent.content).toBe("");

	await act(async () => second.resolve({ content: "new", category: "others" }));
	expect(pageContent.content).toBe("new");
});

it("같은 페이지의 병렬 요청에서는 마지막 요청 결과만 유지한다", async () => {
	const first = deferred();
	const second = deferred();
	mocks.request
		.mockReturnValueOnce(first.promise)
		.mockReturnValueOnce(second.promise);
	await render();
	await act(async () => {
		void pageContent.fetchPageContent();
	});
	await act(async () =>
		second.resolve({ content: "latest", category: "others" }),
	);
	await act(async () =>
		first.resolve({ content: "stale", category: "others" }),
	);
	expect(pageContent.content).toBe("latest");
});

it("같은 URL을 다시 확인하면 본문을 갱신한다", async () => {
	mocks.request
		.mockResolvedValueOnce({ content: "before", category: "others" })
		.mockResolvedValueOnce({ content: "after", category: "others" });
	await render();
	expect(pageContent.content).toBe("before");
	mocks.dataUpdatedAt = 2;
	await render();
	expect(pageContent.content).toBe("after");
});
