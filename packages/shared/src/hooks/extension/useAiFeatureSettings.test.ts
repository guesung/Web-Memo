// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useAiFeatureSettings from "./useAiFeatureSettings";

const mocks = vi.hoisted(() => ({
	get: vi.fn(),
	listeners: new Map<string, (value: unknown) => void>(),
}));
vi.mock("../../modules/chrome-storage", () => ({
	ChromeSyncStorage: {
		get: mocks.get,
		subscribe: (key: string, callback: (value: unknown) => void) => {
			mocks.listeners.set(key, callback);
			return () => mocks.listeners.delete(key);
		},
	},
	STORAGE_KEYS: { summaryEnabled: "summary", aiChatEnabled: "chat" },
}));

let root: Root;
let current: ReturnType<typeof useAiFeatureSettings>;
const TestHook = () => {
	current = useAiFeatureSettings();
	return null;
};
const mount = async () => {
	await act(async () => root.render(createElement(TestHook)));
};

beforeEach(() => {
	vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
	mocks.listeners.clear();
	mocks.get.mockReset();
	document.body.innerHTML = '<div id="root"></div>';
	root = createRoot(document.getElementById("root") as HTMLElement);
});
afterEach(async () => {
	await act(async () => root.unmount());
	vi.unstubAllGlobals();
});

describe("AI 기능 설정 읽기", () => {
	it("저장된 값이 없으면 둘 다 켜진 것으로 본다", async () => {
		mocks.get.mockResolvedValue(undefined);
		await mount();

		expect(current).toEqual({
			isLoaded: true,
			isSummaryEnabled: true,
			isChatEnabled: true,
		});
	});

	it("저장된 꺼짐 값을 키별로 읽는다", async () => {
		mocks.get.mockImplementation(async (key: string) =>
			key === "summary" ? false : undefined,
		);
		await mount();

		expect(current.isSummaryEnabled).toBe(false);
		expect(current.isChatEnabled).toBe(true);
	});

	it("읽는 동안과 읽기에 실패했을 때는 isLoaded가 false다", async () => {
		mocks.get.mockRejectedValue(new Error("failed"));
		await mount();

		expect(current.isLoaded).toBe(false);
	});

	it("열려 있는 동안 저장소가 바뀌면 즉시 반영하고 키가 지워지면 켜짐으로 돌아간다", async () => {
		mocks.get.mockResolvedValue(undefined);
		await mount();

		await act(async () => mocks.listeners.get("chat")?.(false));
		expect(current.isChatEnabled).toBe(false);
		expect(current.isSummaryEnabled).toBe(true);

		await act(async () => mocks.listeners.get("chat")?.(undefined));
		expect(current.isChatEnabled).toBe(true);
	});

	it("언마운트하면 구독을 해제한다", async () => {
		mocks.get.mockResolvedValue(undefined);
		await mount();
		expect(mocks.listeners.size).toBe(2);

		await act(async () => root.render(createElement("div")));
		expect(mocks.listeners.size).toBe(0);
	});
});
