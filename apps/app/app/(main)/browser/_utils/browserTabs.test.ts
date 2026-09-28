import { describe, expect, it } from "vitest";
import type { IFBrowserTabsState } from "@/lib/storage/browserTabs";
import {
	addTab,
	closeTab,
	createEmptyTab,
	createInitialTabsState,
	selectTab,
	updateActiveTab,
} from "./browserTabs";

const stateOf = (activeTabId: string): IFBrowserTabsState => ({
	tabs: [
		{ id: "a", url: "https://a.com", title: "A" },
		{ id: "b", url: "https://b.com", title: "B" },
		{ id: "c", url: "https://c.com", title: "C" },
	],
	activeTabId,
});

describe("createInitialTabsState", () => {
	it("빈 새 탭 하나를 활성 탭으로 만든다", () => {
		const state = createInitialTabsState();

		expect(state.tabs).toHaveLength(1);
		expect(state.tabs[0].url).toBe("");
		expect(state.activeTabId).toBe(state.tabs[0].id);
	});
});

describe("addTab", () => {
	it("탭을 목록 끝에 추가하고 활성화한다", () => {
		const next = addTab(stateOf("a"), createEmptyTab("d"));

		expect(next.tabs.map((tab) => tab.id)).toEqual(["a", "b", "c", "d"]);
		expect(next.activeTabId).toBe("d");
	});
});

describe("selectTab", () => {
	it("해당 탭을 활성화한다", () => {
		expect(selectTab(stateOf("a"), "c").activeTabId).toBe("c");
	});

	it("없는 id면 상태를 바꾸지 않는다", () => {
		const state = stateOf("a");

		expect(selectTab(state, "zzz")).toBe(state);
	});
});

describe("closeTab", () => {
	it("활성 탭을 닫으면 바로 다음 탭이 활성화된다", () => {
		const next = closeTab(stateOf("b"), "b");

		expect(next.tabs.map((tab) => tab.id)).toEqual(["a", "c"]);
		expect(next.activeTabId).toBe("c");
	});

	it("활성 탭이 마지막이면 이전 탭이 활성화된다", () => {
		const next = closeTab(stateOf("c"), "c");

		expect(next.tabs.map((tab) => tab.id)).toEqual(["a", "b"]);
		expect(next.activeTabId).toBe("b");
	});

	it("활성이 아닌 탭을 닫으면 활성 탭은 그대로다", () => {
		const next = closeTab(stateOf("a"), "c");

		expect(next.tabs.map((tab) => tab.id)).toEqual(["a", "b"]);
		expect(next.activeTabId).toBe("a");
	});

	it("마지막 탭을 닫으면 빈 새 탭 하나가 남는다", () => {
		const state: IFBrowserTabsState = {
			tabs: [{ id: "a", url: "https://a.com", title: "A" }],
			activeTabId: "a",
		};
		const next = closeTab(state, "a", createEmptyTab("new"));

		expect(next.tabs).toEqual([{ id: "new", url: "", title: "" }]);
		expect(next.activeTabId).toBe("new");
	});

	it("없는 id면 상태를 바꾸지 않는다", () => {
		const state = stateOf("a");

		expect(closeTab(state, "zzz")).toBe(state);
	});
});

describe("updateActiveTab", () => {
	it("활성 탭의 url/title만 바꾼다", () => {
		const next = updateActiveTab(stateOf("b"), {
			url: "https://new.com",
			title: "New",
		});

		expect(next.tabs[1]).toEqual({
			id: "b",
			url: "https://new.com",
			title: "New",
		});
		expect(next.tabs[0].url).toBe("https://a.com");
		expect(next.tabs[2].url).toBe("https://c.com");
	});

	it("일부 필드만 주면 나머지는 유지한다", () => {
		const next = updateActiveTab(stateOf("a"), { title: "바뀐 제목" });

		expect(next.tabs[0]).toEqual({
			id: "a",
			url: "https://a.com",
			title: "바뀐 제목",
		});
	});
});
