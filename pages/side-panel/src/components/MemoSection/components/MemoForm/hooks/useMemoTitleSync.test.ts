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

let hookOptions: Omit<Parameters<typeof useMemoTitleSync>[0], "onTitleUpdate">;
// 컴포넌트를 하나로 두어야 옵션만 바꾼 호출이 새 마운트가 아니라 리렌더가 된다.
const TestHook = () => {
	hook = useMemoTitleSync({ onTitleUpdate, ...hookOptions });

	return null;
};

const mountHook = async (
	initialSavedTitle?: string,
	extraOptions: Partial<Parameters<typeof useMemoTitleSync>[0]> = {},
) => {
	hookOptions = { initialSavedTitle, ...extraOptions };
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

	it("직접 입력한 제목을 보존하고 연동 클릭 이후 자동 갱신한다", async () => {
		mocks.get.mockResolvedValue({ title: "A" });
		await mountHook();
		await act(async () => hook.handleTitleInputChange("내 제목"));
		mocks.get.mockResolvedValue({ title: "B" });
		await act(async () => refreshTitle());
		expect(onTitleUpdate).toHaveBeenLastCalledWith("내 제목");
		await act(async () => hook.handleTitleSyncClick());
		expect(onTitleUpdate).toHaveBeenLastCalledWith("B");
		mocks.get.mockResolvedValue({ title: "C" });
		await act(async () => refreshTitle());
		expect(onTitleUpdate).toHaveBeenLastCalledWith("C");
		await act(async () => hook.handleTitleInputChange("다시 수정"));
		await act(async () => refreshTitle());
		expect(onTitleUpdate).toHaveBeenLastCalledWith("다시 수정");
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

	it("연동 조회 중 사용자가 입력한 제목은 늦은 응답보다 우선한다", async () => {
		mocks.get.mockResolvedValue({ title: "A" });
		await mountHook();
		let resolveSync: (tab: { title: string }) => void = () => {};
		mocks.get.mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					resolveSync = resolve;
				}),
		);
		let pendingSync: ReturnType<typeof hook.handleTitleSyncClick>;
		await act(async () => {
			pendingSync = hook.handleTitleSyncClick();
		});
		await act(async () => hook.handleTitleInputChange("수동 제목"));
		await act(async () => {
			resolveSync({ title: "A" });
			await pendingSync;
		});
		expect(onTitleUpdate).toHaveBeenLastCalledWith("수동 제목");
	});
});

describe("메모 조회 대기와 제목", () => {
	it("대기 뒤 도착한 저장 제목을 첫 저장으로 오판하지 않고 적용한다", async () => {
		mocks.get.mockResolvedValue({ title: "페이지 제목" });
		const pageOptions = {
			pageUrl: "https://example.com/a",
			pageTitle: "페이지 제목",
		};
		await mountHook(undefined, { ...pageOptions, isMemoResolved: false });
		expect(onTitleUpdate).toHaveBeenLastCalledWith("페이지 제목");

		await mountHook("저장된 제목", {
			...pageOptions,
			memoId: 1,
			isMemoResolved: true,
		});
		expect(onTitleUpdate).toHaveBeenLastCalledWith("저장된 제목");
	});

	it("대기 중 다른 페이지로 옮기면 이전 페이지의 저장 제목 대신 탭 제목을 보여 준다", async () => {
		mocks.get.mockResolvedValue({ title: "A 페이지" });
		await mountHook("A 저장 제목", {
			pageUrl: "https://example.com/a",
			pageTitle: "A 페이지",
			memoId: 1,
			isMemoResolved: true,
		});
		expect(onTitleUpdate).toHaveBeenLastCalledWith("A 저장 제목");

		await mountHook(undefined, {
			pageUrl: "https://example.com/b",
			pageTitle: "B 페이지",
			isMemoResolved: false,
		});
		expect(onTitleUpdate).toHaveBeenLastCalledWith("B 페이지");

		await mountHook(undefined, {
			pageUrl: "https://example.com/b",
			pageTitle: "B 페이지",
			isMemoResolved: true,
		});
		expect(onTitleUpdate).toHaveBeenLastCalledWith("B 페이지");
	});
});
