import AsyncStorage from "@react-native-async-storage/async-storage";
import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => new Map<string, string>());
vi.mock("@react-native-async-storage/async-storage", () => ({
	default: {
		getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
		setItem: vi.fn(async (key: string, value: string) => {
			storage.set(key, value);
		}),
	},
}));

import {
	clearSyncedMemos,
	deleteMemo,
	deleteMemoPermanently,
	getAllMemos,
	getDeletedMemos,
	getMemoByUrl,
	markAsSynced,
	restoreMemo,
	toggleReadingByUrl,
	toggleStarByUrl,
	toggleWishByUrl,
	upsertMemo,
} from "./localMemo";

const first = {
	url: "https://example.com/first",
	title: "첫 메모",
	memo: "첫 내용",
};
const second = {
	url: "https://example.com/second",
	title: "둘째 메모",
	memo: "둘째 내용",
};
beforeEach(() => {
	storage.clear();
	vi.clearAllMocks();
});

describe("로컬 메모 전체배열 transaction", () => {
	it("다른 페이지의 동시 insert가 모두 남는다", async () => {
		await Promise.all([upsertMemo(first), upsertMemo(second)]);
		expect((await getAllMemos()).map((memo) => memo.memo).sort()).toEqual([
			"둘째 내용",
			"첫 내용",
		]);
	});
	it("내용 수정과 세 flag 동시 변경을 모두 보존한다", async () => {
		const saved = await upsertMemo(first);
		await Promise.all([
			upsertMemo({ ...first, selectedId: saved.id, memo: "수정 내용" }),
			toggleWishByUrl(first.url, undefined, undefined, saved.id),
			toggleStarByUrl(first.url, undefined, undefined, saved.id),
			toggleReadingByUrl(first.url, undefined, undefined, saved.id),
		]);
		expect((await getMemoByUrl(first.url))[0]).toMatchObject({
			memo: "수정 내용",
			isWish: true,
			isStar: true,
			isReading: true,
		});
	});
	it("쓰기 실패 뒤에도 다음 transaction은 성공한다", async () => {
		vi.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error("disk"));
		const results = await Promise.allSettled([
			upsertMemo(first),
			upsertMemo(second),
		]);
		expect(results.map((result) => result.status)).toEqual([
			"rejected",
			"fulfilled",
		]);
		expect((await getAllMemos()).map((memo) => memo.url)).toEqual([second.url]);
	});
	it("예상 신규 후보는 같은 페이지의 두 번째 insert와 임의 덮어쓰기를 거부한다", async () => {
		const results = await Promise.allSettled([
			upsertMemo({ ...first, expectedNew: true }),
			upsertMemo({ ...first, memo: "덮어쓸 내용", expectedNew: true }),
		]);
		expect(results.map((result) => result.status)).toEqual([
			"fulfilled",
			"rejected",
		]);
		expect((await getMemoByUrl(first.url))[0].memo).toBe(first.memo);
	});
	it("삭제·복원과 다른 메모 쓰기가 동시여도 휴지통과 살아있는 내용을 보존한다", async () => {
		const a = await upsertMemo(first);
		await Promise.all([deleteMemo(a.id), upsertMemo(second)]);
		expect((await getDeletedMemos()).map((memo) => memo.id)).toEqual([a.id]);
		expect((await getAllMemos()).map((memo) => memo.url)).toEqual([second.url]);
		await Promise.all([
			restoreMemo(a.id),
			upsertMemo({ ...second, memo: "수정" }),
		]);
		expect(await getDeletedMemos()).toEqual([]);
		expect(await getAllMemos()).toHaveLength(2);
		expect((await getMemoByUrl(second.url))[0].memo).toBe("수정");
	});
	it("동기화 정리와 영구 삭제가 동시 입력 메모를 지우지 않는다", async () => {
		const a = await upsertMemo(first);
		const b = await upsertMemo(second);
		await Promise.all([
			markAsSynced([a.id]),
			upsertMemo({ ...second, memo: "갱신" }),
		]);
		await Promise.all([
			clearSyncedMemos(),
			upsertMemo({ url: "https://example.com/third", title: "셋", memo: "셋" }),
		]);
		expect(await getMemoByUrl(first.url)).toEqual([]);
		expect((await getMemoByUrl(second.url))[0].memo).toBe("갱신");
		await Promise.all([
			deleteMemoPermanently(b.id),
			toggleStarByUrl("https://example.com/third"),
		]);
		expect(await getAllMemos()).toHaveLength(1);
		expect((await getAllMemos())[0]).toMatchObject({
			memo: "셋",
			isStar: true,
		});
	});
});
