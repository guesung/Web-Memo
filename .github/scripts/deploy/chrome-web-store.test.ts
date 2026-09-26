import { afterEach, describe, expect, it, vi } from "vitest";
import {
	fetchItemStatus,
	toItemName,
	uploadAndPublish,
	waitForUpload,
} from "./chrome-web-store.mjs";

const ITEM = toItemName({ publisherId: "pub-1", extensionId: "ext-1" });
const noSleep = async () => {};

/** 호출 순서대로 응답을 돌려주는 fetch 대역. 응답이 모자라면 테스트가 실패하도록 던집니다. */
const stubFetch = (responses: Array<{ ok?: boolean; status?: number; body: unknown }>) => {
	const queue = [...responses];
	const fetchMock = vi.fn(async () => {
		const next = queue.shift();

		if (!next) {
			throw new Error("예상보다 fetch가 더 많이 호출됐습니다");
		}

		return {
			ok: next.ok ?? true,
			status: next.status ?? 200,
			json: async () => next.body,
			text: async () => JSON.stringify(next.body),
		};
	});

	vi.stubGlobal("fetch", fetchMock);

	return fetchMock;
};

const calledUrls = (fetchMock: ReturnType<typeof vi.fn>) =>
	fetchMock.mock.calls.map(([url]) => url);

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("toItemName", () => {
	it("게시자 ID와 확장 ID로 v2 항목 이름을 만든다", () => {
		expect(ITEM).toBe("publishers/pub-1/items/ext-1");
	});
});

describe("fetchItemStatus", () => {
	it("v2 fetchStatus를 액세스 토큰과 함께 GET으로 부른다", async () => {
		const fetchMock = stubFetch([{ body: { itemId: "ext-1" } }]);

		await fetchItemStatus({ accessToken: "tok", itemName: ITEM });

		expect(fetchMock).toHaveBeenCalledWith(
			"https://chromewebstore.googleapis.com/v2/publishers/pub-1/items/ext-1:fetchStatus",
			{ headers: { authorization: "Bearer tok" } },
		);
	});

	it("2xx가 아니면 본문을 담아 던진다", async () => {
		stubFetch([{ ok: false, status: 403, body: { error: "권한 없음" } }]);

		await expect(
			fetchItemStatus({ accessToken: "tok", itemName: ITEM }),
		).rejects.toThrow(/403.*권한 없음/);
	});
});

describe("waitForUpload", () => {
	it("IN_PROGRESS가 끝나 SUCCEEDED가 될 때까지 상태를 다시 묻는다", async () => {
		const fetchMock = stubFetch([
			{ body: { lastAsyncUploadState: "IN_PROGRESS" } },
			{ body: { lastAsyncUploadState: "SUCCEEDED" } },
		]);

		await expect(
			waitForUpload({ accessToken: "tok", itemName: ITEM, sleep: noSleep }),
		).resolves.toBe("SUCCEEDED");
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("제한 횟수 안에 끝나지 않으면 던진다", async () => {
		stubFetch(
			Array.from({ length: 36 }, () => ({
				body: { lastAsyncUploadState: "IN_PROGRESS" },
			})),
		);

		await expect(
			waitForUpload({ accessToken: "tok", itemName: ITEM, sleep: noSleep }),
		).rejects.toThrow(/끝나지 않았습니다/);
	});
});

describe("uploadAndPublish", () => {
	it("업로드가 바로 SUCCEEDED면 폴링 없이 DEFAULT_PUBLISH로 제출한다", async () => {
		const fetchMock = stubFetch([
			{ body: { uploadState: "SUCCEEDED", crxVersion: "1.2.3" } },
			{ body: { state: "PENDING_REVIEW" } },
		]);

		await expect(
			uploadAndPublish({
				accessToken: "tok",
				itemName: ITEM,
				zip: Buffer.from("zip"),
				sleep: noSleep,
			}),
		).resolves.toEqual({ crxVersion: "1.2.3", publishState: "PENDING_REVIEW" });

		expect(calledUrls(fetchMock)).toEqual([
			"https://chromewebstore.googleapis.com/upload/v2/publishers/pub-1/items/ext-1:upload",
			"https://chromewebstore.googleapis.com/v2/publishers/pub-1/items/ext-1:publish",
		]);
		expect(fetchMock.mock.calls[1][1].body).toBe(
			JSON.stringify({ publishType: "DEFAULT_PUBLISH" }),
		);
	});

	it("업로드가 IN_PROGRESS면 끝난 뒤에 게시를 제출한다", async () => {
		const fetchMock = stubFetch([
			{ body: { uploadState: "IN_PROGRESS", crxVersion: "1.2.3" } },
			{ body: { lastAsyncUploadState: "SUCCEEDED" } },
			{ body: { state: "PENDING_REVIEW" } },
		]);

		await uploadAndPublish({
			accessToken: "tok",
			itemName: ITEM,
			zip: Buffer.from("zip"),
			sleep: noSleep,
		});

		expect(calledUrls(fetchMock).map((url) => String(url).split(":").pop())).toEqual([
			"upload",
			"fetchStatus",
			"publish",
		]);
	});

	// 업로드가 실패했는데 게시를 제출하면 이전 버전이 다시 제출될 수 있다
	it("업로드가 FAILED면 게시를 제출하지 않고 던진다", async () => {
		const fetchMock = stubFetch([{ body: { uploadState: "FAILED" } }]);

		await expect(
			uploadAndPublish({
				accessToken: "tok",
				itemName: ITEM,
				zip: Buffer.from("zip"),
				sleep: noSleep,
			}),
		).rejects.toThrow(/FAILED/);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it.each(["REJECTED", "CANCELLED"])(
		"게시 제출이 %s면 던진다",
		async (state) => {
			stubFetch([
				{ body: { uploadState: "SUCCEEDED", crxVersion: "1.2.3" } },
				{ body: { state } },
			]);

			await expect(
				uploadAndPublish({
					accessToken: "tok",
					itemName: ITEM,
					zip: Buffer.from("zip"),
					sleep: noSleep,
				}),
			).rejects.toThrow(state);
		},
	);
});
