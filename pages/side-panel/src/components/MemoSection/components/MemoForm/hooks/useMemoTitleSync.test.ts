// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useMemoTitleSync } from "./useMemoTitleSync";

const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@web-memo/shared/utils/extension", () => ({
	Tab: { get: mocks.get },
}));

let root: Root;
let hook: ReturnType<typeof useMemoTitleSync>;
let refreshTitle: () => Promise<void>;
const onTitleUpdate = vi.fn();

const mountHook = async (initialSavedTitle?: string) => {
	const TestHook = () => {
		hook = useMemoTitleSync({ onTitleUpdate, initialSavedTitle });

		return null;
	};
	await act(async () => root.render(createElement(TestHook)));
};

beforeEach(() => {
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	vi.stubGlobal("chrome", {
		tabs: {
			onActivated: { addListener: vi.fn(), removeListener: vi.fn() },
			onUpdated: {
				addListener: vi.fn((listener) => {
					refreshTitle = listener;
				}),
				removeListener: vi.fn(),
			},
		},
	});
	mocks.get.mockReset();
	onTitleUpdate.mockReset();
	document.body.innerHTML = "<div id='root'></div>";
	root = createRoot(document.getElementById("root") as HTMLElement);
});

afterEach(async () => {
	await act(async () => root.unmount());
	vi.unstubAllGlobals();
});

describe("사이드패널 제목 연동", () => {
	it("첫 페이지와 이후 페이지의 제목을 자동 반영한다", async () => {
		mocks.get.mockResolvedValue({
			id: 1,
			url: "https://example.com/a",
			title: "A",
		});
		await mountHook();
		expect(onTitleUpdate).toHaveBeenLastCalledWith("A");
		mocks.get.mockResolvedValue({
			id: 2,
			url: "https://example.com/b",
			title: "B",
		});
		await act(async () => refreshTitle());
		expect(onTitleUpdate).toHaveBeenLastCalledWith("B");
	});

	it("직접 입력한 제목을 보존한다", async () => {
		mocks.get.mockResolvedValue({ title: "A" });
		await mountHook();
		await act(async () => hook.handleTitleInputChange("내 제목"));
		mocks.get.mockResolvedValue({ title: "B" });
		await act(async () => refreshTitle());
		expect(onTitleUpdate).toHaveBeenLastCalledWith("내 제목");
	});

	it("저장된 사용자 지정 제목은 최초 진입에서도 보존한다", async () => {
		mocks.get.mockResolvedValue({ title: "페이지 제목" });
		await mountHook("저장된 제목");
		expect(onTitleUpdate).toHaveBeenLastCalledWith("저장된 제목");
	});

	it("이전 페이지의 늦은 응답은 최신 페이지 제목을 덮어쓰지 않는다", async () => {
		let resolvePrevious: (tab: { title: string }) => void = () => {};
		mocks.get.mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					resolvePrevious = resolve;
				}),
		);
		await mountHook();
		mocks.get.mockResolvedValue({ title: "최신 SPA 페이지" });
		await act(async () => refreshTitle());
		await act(async () => resolvePrevious({ title: "이전 페이지" }));
		expect(onTitleUpdate).toHaveBeenCalledTimes(1);
		expect(onTitleUpdate).toHaveBeenLastCalledWith("최신 SPA 페이지");
	});
});
