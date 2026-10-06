// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PastMemoNotice from "./PastMemoNotice";

const mocks = vi.hoisted(() => ({
	trackEvent: vi.fn(),
	createTab: vi.fn(),
	dismissCurrentUrl: vi.fn(async () => {}),
	match: {
		normalizedUrl: "https://example.com/current",
		duplicate: {
			id: 1,
			title: "Saved duplicate",
			url: "https://duplicate.example.com/memo",
			source: "rule" as const,
		} as {
			id: number;
			title: string;
			url: string;
			source: "rule" | "jev";
		} | null,
		relatedMemos: [
			{
				id: 2,
				title: "First related",
				url: "https://first.example.com/memo",
				favIconUrl: null,
				updatedAt: null,
			},
			{
				id: 3,
				title: "Second related",
				url: "https://second.example.com/memo",
				favIconUrl: null,
				updatedAt: null,
			},
		] as Array<{
			id: number;
			title: string;
			url: string;
			favIconUrl: string | null;
			updatedAt: string | null;
		}>,
		dismissCurrentUrl: () => mocks.dismissCurrentUrl(),
	},
}));

vi.mock("@web-memo/shared/modules/analytics", () => ({
	analytics: { trackEvent: mocks.trackEvent },
}));
vi.mock("@web-memo/env", () => ({ CONFIG: { webUrl: "https://example.com" } }));
vi.mock("@web-memo/shared/utils/extension", () => ({
	I18n: { get: (key: string) => key, getUILanguage: () => "en" },
	Tab: { create: mocks.createTab },
}));
vi.mock("../hooks", () => ({ usePastMemoMatch: () => mocks.match }));

let root: Root;

async function render() {
	await act(async () =>
		root.render(createElement(PastMemoNotice, { hasMemoData: false })),
	);
}

async function click(selector: string) {
	const button = document.querySelector(selector);
	expect(button).not.toBeNull();
	await act(async () =>
		button?.dispatchEvent(new MouseEvent("click", { bubbles: true })),
	);
}

async function clickButtonWithText(text: string) {
	const button = Array.from(document.querySelectorAll("button")).find(
		(candidate) => candidate.textContent?.startsWith(text),
	);
	expect(button).toBeDefined();
	await act(async () =>
		button?.dispatchEvent(new MouseEvent("click", { bubbles: true })),
	);
}

function events(name: string) {
	return mocks.trackEvent.mock.calls
		.map(([event]) => event)
		.filter((event) => event.name === name);
}

beforeEach(() => {
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	document.body.innerHTML = '<div id="root"></div>';
	root = createRoot(document.getElementById("root") as HTMLElement);
	mocks.trackEvent.mockClear();
	mocks.createTab.mockClear();
	mocks.dismissCurrentUrl.mockClear();
	mocks.match.normalizedUrl = "https://example.com/current";
	mocks.match.duplicate = {
		id: 1,
		title: "Saved duplicate",
		url: "https://duplicate.example.com/memo",
		source: "rule",
	};
	mocks.match.relatedMemos = [
		{
			id: 2,
			title: "First related",
			url: "https://first.example.com/memo",
			favIconUrl: null,
			updatedAt: null,
		},
		{
			id: 3,
			title: "Second related",
			url: "https://second.example.com/memo",
			favIconUrl: null,
			updatedAt: null,
		},
	];
});

afterEach(async () => {
	await act(async () => root.unmount());
	vi.unstubAllGlobals();
});

describe("PastMemoNotice analytics", () => {
	it("같은 URL에서는 duplicate와 related 노출을 각각 한 번만 기록하고 새 URL에서는 다시 기록한다", async () => {
		await render();
		await render();
		expect(events("past_memo_show")).toEqual([
			{ name: "past_memo_show", params: { kind: "duplicate", source: "rule" } },
			{ name: "past_memo_show", params: { kind: "related", source: "jev" } },
		]);

		mocks.match.duplicate = null;
		mocks.match.relatedMemos = [];
		await render();
		mocks.match.duplicate = {
			id: 1,
			title: "Saved duplicate",
			url: "https://duplicate.example.com/memo",
			source: "rule",
		};
		mocks.match.relatedMemos = [
			{
				id: 2,
				title: "First related",
				url: "https://first.example.com/memo",
				favIconUrl: null,
				updatedAt: null,
			},
		];
		await render();
		expect(events("past_memo_show")).toHaveLength(2);

		mocks.match.normalizedUrl = "https://example.com/next";
		await render();
		expect(events("past_memo_show")).toHaveLength(4);
	});

	it("한 번의 닫기로 화면에 보이는 두 종류의 dismiss를 각각 기록한다", async () => {
		await render();
		await click('button[aria-label="past_memo_dismiss"]');

		expect(events("past_memo_dismiss")).toEqual([
			{
				name: "past_memo_dismiss",
				params: { kind: "duplicate", source: "rule" },
			},
			{ name: "past_memo_dismiss", params: { kind: "related", source: "jev" } },
		]);
		expect(mocks.dismissCurrentUrl).toHaveBeenCalledTimes(1);
	});

	it("열기 이벤트는 URL·종류별 첫 클릭에만 기록하지만 각 클릭은 탭을 연다", async () => {
		await render();
		await clickButtonWithText("past_memo_open");
		await clickButtonWithText("past_memo_open");
		await click('button[title="first.example.com"]');
		await click('button[title="first.example.com"]');

		expect(events("past_memo_open")).toEqual([
			{ name: "past_memo_open", params: { kind: "duplicate", source: "rule" } },
			{ name: "past_memo_open", params: { kind: "related", source: "jev" } },
		]);
		expect(mocks.createTab).toHaveBeenCalledTimes(4);
	});

	it("관련 메모 목록을 닫았다 다시 펼칠 때마다 expand를 기록한다", async () => {
		await render();
		await clickButtonWithText("past_memo_related_more");
		await clickButtonWithText("past_memo_related_more");
		await clickButtonWithText("past_memo_related_more");

		expect(events("past_memo_expand")).toEqual([
			{ name: "past_memo_expand", params: { kind: "related", source: "jev" } },
			{ name: "past_memo_expand", params: { kind: "related", source: "jev" } },
		]);
	});
});
