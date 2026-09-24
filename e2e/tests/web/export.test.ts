import { readFile } from "node:fs/promises";
import type { Download, Page } from "@playwright/test";
import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/web";
import { gotoSafely, LANGUAGE } from "../lib";
import {
	createMockMemo,
	MockSupabaseStore,
	resetMockIds,
	setupSupabaseMocks,
} from "../lib/mocks";

/**
 * 목에 넣는 메모 수.
 * @description 내보내기(getMemos)는 1000건씩 range로 네 번 읽고 앞의 두 번만 합친다(memoService.ts).
 * 한 장(1000건)을 넘겨야 두 번째 장이 첫 장과 겹치지 않고 이어지는지 보인다. 2000건을 넘기면
 * 제품이 버리는 구간이라 넣지 않는다.
 */
const EXPORTED_MEMO_COUNT = 1200;

/** 메모마다 제목에 새기는 식별자. `Test Memo 1`이 `Test Memo 10`에 걸리지 않게 앞뒤를 막는다. */
const memoMarker = (id: number) => `ExportMemo#${id}#`;

/** 파일 본문에서 식별자가 메모마다 몇 번 나오는지 센다. */
const countMarkers = (content: string) => {
	const countById = new Map<number, number>();
	const markers = content.match(/ExportMemo#\d+#/g) ?? [];
	for (const marker of markers) {
		const id = Number(marker.replace(/\D/g, ""));
		countById.set(id, (countById.get(id) ?? 0) + 1);
	}

	return countById;
};

/** 내려받은 파일을 문자열로 읽는다. */
const readDownload = async (download: Download) => {
	const filePath = await download.path();

	return readFile(filePath, "utf-8");
};

/** 내보내기 메뉴를 열고 형식을 고른다. */
const clickExportFormat = async (page: Page, formatName: string) => {
	await page.getByRole("button", { name: "Export memos" }).click();
	await page.getByRole("menuitem", { name: formatName, exact: true }).click();
};

/** 형식을 고르고 내려받은 파일을 기다린다. */
const exportAs = async (page: Page, formatName: string) => {
	const downloadPromise = page.waitForEvent("download");
	await clickExportFormat(page, formatName);

	return downloadPromise;
};

test.describe("메모 내보내기 (Mocked)", () => {
	let store: MockSupabaseStore;

	test.beforeEach(async ({ page }) => {
		resetMockIds();
		store = new MockSupabaseStore();
		await setupSupabaseMocks(page, store);
	});

	test.describe("메모가 한 장(1000건)보다 많으면", () => {
		let memoIds: number[];

		test.beforeEach(async ({ page }) => {
			memoIds = [];
			for (let index = 0; index < EXPORTED_MEMO_COUNT; index++) {
				const memo = createMockMemo();
				store.addMemo({ ...memo, title: memoMarker(memo.id) });
				memoIds.push(memo.id);
			}

			await gotoSafely({
				page,
				url: `${LANGUAGE}${PATHS.settings}`,
				regexp: new RegExp(PATHS.settings),
			});
		});

		test("JSON에 모든 메모가 중복 없이 한 번씩 담긴다.", async ({ page }) => {
			const download = await exportAs(page, "JSON");

			expect(download.suggestedFilename()).toMatch(
				/^memos-\d{4}-\d{2}-\d{2}\.json$/,
			);
			const exportedMemos: { id: number }[] = JSON.parse(
				await readDownload(download),
			);
			const exportedIds = exportedMemos.map((memo) => memo.id);

			expect(exportedIds).toHaveLength(EXPORTED_MEMO_COUNT);
			expect(new Set(exportedIds).size).toBe(EXPORTED_MEMO_COUNT);
			expect(new Set(exportedIds)).toEqual(new Set(memoIds));
		});

		test("CSV에 모든 메모가 한 번씩 담긴다.", async ({ page }) => {
			const download = await exportAs(page, "CSV");

			expect(download.suggestedFilename()).toMatch(
				/^memos-\d{4}-\d{2}-\d{2}\.csv$/,
			);
			const countById = countMarkers(await readDownload(download));

			expect(countById.size).toBe(EXPORTED_MEMO_COUNT);
			for (const id of memoIds) {
				expect(countById.get(id), `메모 ${id}`).toBe(1);
			}
		});

		test("Markdown에 모든 메모가 한 번씩 담긴다.", async ({ page }) => {
			const download = await exportAs(page, "Markdown");

			expect(download.suggestedFilename()).toMatch(
				/^memos-\d{4}-\d{2}-\d{2}\.md$/,
			);
			const countById = countMarkers(await readDownload(download));

			expect(countById.size).toBe(EXPORTED_MEMO_COUNT);
			for (const id of memoIds) {
				expect(countById.get(id), `메모 ${id}`).toBe(1);
			}
		});
	});

	test("메모가 없으면 내려받지 않는다.", async ({ page }) => {
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.settings}`,
			regexp: new RegExp(PATHS.settings),
		});

		let downloadCount = 0;
		page.on("download", () => {
			downloadCount++;
		});
		// getMemos는 네 장을 한꺼번에 요청한다. 마지막 장까지 응답을 받아야 내보내기가 판단을 끝낸다.
		const lastPageResponsePromise = page.waitForResponse(
			(response) =>
				response.url().includes("/rest/v1/memo") &&
				new URL(response.url()).searchParams.get("offset") === "3000",
		);

		await clickExportFormat(page, "JSON");
		await lastPageResponsePromise;

		// 내려받기가 없다는 것은 관측할 이벤트가 없으므로, 응답 뒤 잠시 기다려 다운로드가 오지 않음을 본다.
		await expect(
			page.waitForEvent("download", { timeout: 2_000 }),
		).rejects.toThrow();
		await expect(
			page.getByRole("button", { name: "Export memos" }),
		).toBeEnabled();
		expect(downloadCount).toBe(0);
	});
});
