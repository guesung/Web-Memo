import { beforeEach, describe, expect, it, vi } from "vitest";

const asyncStorage = vi.hoisted(() => new Map<string, string>());
const secureStore = vi.hoisted(() => new Map<string, string>());

vi.mock("@react-native-async-storage/async-storage", () => ({
	default: {
		getItem: vi.fn(async (key: string) => asyncStorage.get(key) ?? null),
		setItem: vi.fn(async (key: string, value: string) => {
			asyncStorage.set(key, value);
		}),
	},
}));

vi.mock("expo-secure-store", () => ({
	getItemAsync: vi.fn(async (key: string) => secureStore.get(key) ?? null),
	setItemAsync: vi.fn(async (key: string, value: string) => {
		secureStore.set(key, value);
	}),
	deleteItemAsync: vi.fn(async (key: string) => {
		secureStore.delete(key);
	}),
}));

vi.mock("react-native", () => ({ Platform: { OS: "ios" } }));

import {
	addSharedExtensionPendingUrl,
	getPendingSharedUrls,
	migrateSharedExtensionPendingUrls,
	preserveSharedUrl,
} from "./pendingSharedUrls";

beforeEach(() => {
	asyncStorage.clear();
	secureStore.clear();
});

describe("migrateSharedExtensionPendingUrls", () => {
	it("공유 확장이 App Group에 보관한 요청을 본 앱 보류 목록으로 옮기고 비운다", async () => {
		await addSharedExtensionPendingUrl({
			url: "https://example.com/a",
			title: "A",
			favIconUrl: null,
			createdAt: "2026-09-28T00:00:00.000Z",
		});

		await migrateSharedExtensionPendingUrls();

		const pending = await getPendingSharedUrls();
		expect(pending.map((item) => item.url)).toEqual(["https://example.com/a"]);
		expect(secureStore.size).toBe(0);
	});

	it("본 앱에 이미 있는 보류 요청과 합쳐 같은 URL은 확장 쪽 값으로 덮어쓴다", async () => {
		await preserveSharedUrl({
			url: "https://example.com/a",
			title: "옛 제목",
			favIconUrl: null,
			createdAt: "2026-09-27T00:00:00.000Z",
		});
		await addSharedExtensionPendingUrl({
			url: "https://example.com/a",
			title: "새 제목",
			favIconUrl: null,
			createdAt: "2026-09-28T00:00:00.000Z",
		});

		await migrateSharedExtensionPendingUrls();

		const pending = await getPendingSharedUrls();
		expect(pending).toHaveLength(1);
		expect(pending[0].title).toBe("새 제목");
	});

	it("공유 확장 보류 목록이 비어 있으면 아무 것도 하지 않는다", async () => {
		await preserveSharedUrl({
			url: "https://example.com/a",
			title: "본 앱 보류",
			favIconUrl: null,
			createdAt: "2026-09-28T00:00:00.000Z",
		});

		await migrateSharedExtensionPendingUrls();

		const pending = await getPendingSharedUrls();
		expect(pending.map((item) => item.url)).toEqual(["https://example.com/a"]);
	});
});
