import type { Page } from "@playwright/test";
import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/web";
import {
	cleanupTestData,
	createCleanupClient,
	createTestNamespace,
	getRunId,
	gotoSafely,
	LANGUAGE,
} from "../lib";

/** 테스트 계정에 넣을 메모 한 건. */
interface IFRealMemoSeed {
	/** 네임스페이스가 새겨진 메모 URL */
	url: string;
	/** 카드를 집을 때 쓰는 제목. 다른 실행의 메모와 겹치지 않게 URL을 담는다 */
	title: string;
	/** 휴지통에 이미 들어 있는 상태로 넣을지 */
	isInTrash: boolean;
}

/**
 * 테스트 계정에 메모를 실제로 넣는다.
 * @throws 삽입에 실패하면 던진다. 메모가 없으면 검증할 대상이 없다.
 */
const insertRealMemos = async (seeds: IFRealMemoSeed[]) => {
	const client = await createCleanupClient();
	const { error } = await client.from("memo").insert(
		seeds.map((seed) => ({
			url: seed.url,
			title: seed.title,
			memo: seed.title,
			deleted_at: seed.isInTrash ? new Date().toISOString() : null,
		})),
	);

	if (error) {
		throw new Error(`메모 생성 실패: ${error.message}`);
	}
};

/** 메모 목록을 새로 연다. 목록은 서버에서 다시 읽는다. */
const gotoMemos = (page: Page) =>
	gotoSafely({
		page,
		url: `${LANGUAGE}${PATHS.memos}`,
		regexp: new RegExp(`${PATHS.memos}$`),
	});

/**
 * 휴지통을 사이드바 링크로 연다.
 * @description 주소로 바로 열거나 새로고침하면 휴지통에 항목이 있을 때 빈 화면이 된다.
 * dayjs relativeTime 플러그인이 브라우저(useEffect)에서만 등록돼, 서버 렌더링 중
 * `fromNow is not a function`이 나기 때문이다(apps/web/src/app/_components/InitDayjs).
 * 제품 버그라 이 테스트 범위에서 고치지 않고, 고쳐지면 `gotoSafely`로 주소 진입을 검증한다.
 */
const gotoTrash = async (page: Page) => {
	await gotoMemos(page);
	await page.getByRole("link", { name: "Trash", exact: true }).click();
	await page.waitForURL(new RegExp(PATHS.memosTrash));
};

/** 메모 목록의 카드. 휴지통 그리드 밖의 카드만 본다. */
const getMemoListCard = (page: Page, title: string) =>
	page.locator(".memo-item", { hasText: title });

/** 휴지통 그리드의 카드. */
const getTrashCard = (page: Page, title: string) =>
	page.locator("#trash-grid .memo-item", { hasText: title });

/** 메모 목록에서 카드의 옵션 메뉴로 메모를 휴지통에 보낸다. */
const moveToTrashFromMemoList = async (page: Page, title: string) => {
	const memoCard = getMemoListCard(page, title);
	await memoCard.hover();
	await memoCard.getByTestId("memo-option").click();
	await page.getByTestId("memo-delete-button").click();

	await expect(memoCard).toBeHidden();
};

/**
 * 휴지통의 첫 렌더는 서버가 실DB에서 읽으므로 page.route로 가로챌 수 없다. 그래서 이 테스트 전용 메모를
 * 실DB에 넣고, 단언은 자기 네임스페이스의 카드에만 한다. 다른 실행의 휴지통 항목이 보여도 무시한다.
 * "휴지통 비우기"는 테스트 계정의 휴지통 전체를 지우므로 확인 창을 열고 취소만 누른다.
 */
test.describe("휴지통 (실DB)", () => {
	let movedMemo: IFRealMemoSeed;
	let keptMemo: IFRealMemoSeed;

	test.beforeEach(async () => {
		const namespace = createTestNamespace({
			runId: getRunId(),
			testId: test.info().testId,
		});
		const movedMemoUrl = namespace.memoUrl("trash-moved");
		const keptMemoUrl = namespace.memoUrl("trash-kept");
		movedMemo = {
			url: movedMemoUrl,
			title: `휴지통으로 옮길 메모 ${movedMemoUrl}`,
			isInTrash: false,
		};
		keptMemo = {
			url: keptMemoUrl,
			title: `휴지통에 남을 메모 ${keptMemoUrl}`,
			isInTrash: true,
		};

		await insertRealMemos([movedMemo, keptMemo]);
	});

	test.afterEach(async () => {
		await cleanupTestData({ memoUrls: [movedMemo.url, keptMemo.url] });
	});

	test("지운 메모는 휴지통에 모이고, 되살리거나 하나만 완전히 지울 수 있다.", async ({
		page,
	}) => {
		await gotoMemos(page);
		await moveToTrashFromMemoList(page, movedMemo.title);

		await gotoTrash(page);
		await expect(getTrashCard(page, movedMemo.title)).toBeVisible();
		await expect(getTrashCard(page, keptMemo.title)).toBeVisible();

		await getTrashCard(page, movedMemo.title)
			.getByRole("button", { name: "Restore" })
			.click();
		await expect(getTrashCard(page, movedMemo.title)).toBeHidden();

		await gotoMemos(page);
		await expect(getMemoListCard(page, movedMemo.title)).toBeVisible();

		await moveToTrashFromMemoList(page, movedMemo.title);
		await gotoTrash(page);
		await getTrashCard(page, movedMemo.title)
			.getByRole("button", { name: "Delete permanently" })
			.click();

		// 카드 하나만 고른 확인 창인지 본 뒤에 확정한다. 휴지통 비우기 확인 창이면 다른 실행의 메모까지 지워진다.
		const confirmDialog = page.getByRole("alertdialog");
		await expect(confirmDialog).toContainText("Permanently delete 1 memos?");
		await confirmDialog
			.getByRole("button", { name: "Delete permanently" })
			.click();

		await expect(getTrashCard(page, movedMemo.title)).toBeHidden();
		await expect(getTrashCard(page, keptMemo.title)).toBeVisible();

		await gotoTrash(page);
		await expect(getTrashCard(page, keptMemo.title)).toBeVisible();
		await expect(getTrashCard(page, movedMemo.title)).toHaveCount(0);
	});

	test("휴지통 비우기는 확인 창을 띄우고, 취소하면 아무것도 지우지 않는다.", async ({
		page,
	}) => {
		await gotoTrash(page);
		const keptMemoCard = getTrashCard(page, keptMemo.title);
		await expect(keptMemoCard).toBeVisible();

		await page.getByRole("button", { name: "Empty trash" }).click();

		const confirmDialog = page.getByRole("alertdialog");
		await expect(confirmDialog).toBeVisible();
		await confirmDialog.getByRole("button", { name: "Cancel" }).click();

		await expect(confirmDialog).toBeHidden();
		await expect(keptMemoCard).toBeVisible();

		await gotoTrash(page);
		await expect(keptMemoCard).toBeVisible();
	});
});
