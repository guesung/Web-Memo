import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/web";
import { gotoSafely, LANGUAGE } from "../lib";
import {
	createMockCategory,
	createMockMemo,
	MockSupabaseStore,
	resetMockIds,
	setupSupabaseMocks,
} from "../lib/mocks";

const LONG_DOMAIN = "very-long-domain-name-without-spaces.example.com";

test.describe("도메인별 메모 보기 (Mocked)", () => {
	test.beforeEach(async ({ page }) => {
		resetMockIds();
		const store = new MockSupabaseStore();
		const category = store.addCategory(createMockCategory({ name: "Work" }));

		for (let order = 1; order <= 22; order++) {
			const url =
				order === 20
					? `https://${LONG_DOMAIN}/post`
					: order === 22
						? "file:///memo"
						: `https://${order === 21 ? "WWW." : ""}example.com/post-${order}`;
			store.addMemo(
				createMockMemo({
					title: `도메인 메모 ${String(order).padStart(2, "0")}`,
					memo: `본문 ${order}`,
					url,
					category_id: order === 1 ? category.id : null,
				}),
			);
		}

		await setupSupabaseMocks(page, store);
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.memos}`,
			regexp: new RegExp(PATHS.memos),
		});
	});

	test("도메인 버튼은 기존 필터를 보존하고 검색·상세 보기에도 적용된다", async ({
		page,
	}) => {
		await page.getByRole("button", { name: "By domain" }).click();
		await expect(page).toHaveURL(/view=domain/);
		await expect(
			page.getByRole("button", { name: "By domain" }),
		).toHaveAttribute("aria-pressed", "true");
		await expect(page.getByTestId("memo-domain-label").first()).toHaveText(
			"example.com",
		);

		await page.getByPlaceholder("Search memos").fill("도메인 메모 01");
		await expect(page.getByTestId("memo-list-item")).toHaveCount(1);
		await page.getByTestId("memo-list-item").click();
		await expect(page).toHaveURL(/view=domain.*id=1/);
		await expect(page.getByTestId("memo-textarea")).toHaveValue("본문 1");
	});

	test("페이지 경계의 같은 도메인을 병합하고 비웹 URL은 별도 그룹에 둔다", async ({
		page,
	}) => {
		await page.getByRole("button", { name: "By domain" }).click();
		const groups = page.getByTestId("memo-domain-group");
		await expect(page.getByTestId("memo-list-item")).toHaveCount(20);
		await expect(groups).toHaveCount(2);

		await page.getByRole("button", { name: "Load more" }).click();
		await expect(page.getByTestId("memo-list-item")).toHaveCount(22);
		await expect(groups).toHaveCount(3);
		await expect(groups.first().getByTestId("memo-list-item")).toHaveCount(20);
		const longDomainLabel = groups.nth(1).getByTestId("memo-domain-label");
		await expect(longDomainLabel).toHaveText(LONG_DOMAIN);
		expect(
			await longDomainLabel.evaluate(
				(label) => label.scrollWidth - label.clientWidth,
			),
		).toBeLessThanOrEqual(1);
		await expect(groups.nth(2).getByTestId("memo-domain-label")).toHaveText(
			"No domain",
		);
		await expect(groups.first().getByTestId("memo-title").last()).toHaveText(
			"도메인 메모 21",
		);
	});

	test("모바일에서는 도메인명이 카드 위에 놓이고 카테고리 조건을 유지한다", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto(`${LANGUAGE}${PATHS.memos}?category=Work`);
		await page.getByRole("button", { name: "By domain" }).click();
		await expect(page).toHaveURL(/category=Work.*view=domain/);
		const group = page.getByTestId("memo-domain-group");
		await expect(group.getByTestId("memo-list-item")).toHaveCount(1);
		const labelBox = await group.getByTestId("memo-domain-label").boundingBox();
		const gridBox = await group.getByTestId("memo-domain-grid").boundingBox();
		expect(labelBox && gridBox).toBeTruthy();
		if (labelBox && gridBox) {
			expect(labelBox.y + labelBox.height).toBeLessThanOrEqual(gridBox.y + 1);
		}
	});
});
