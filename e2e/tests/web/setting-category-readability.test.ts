import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/web";
import { gotoSafely } from "../lib";
import {
	createMockCategory,
	MockSupabaseStore,
	setupSupabaseMocks,
} from "../lib/mocks";

for (const viewportWidth of [390, 1280]) {
	test(`설정 카테고리 항목은 ${viewportWidth}px에서 긴 이름과 편집 버튼을 표시한다 (Mocked)`, async ({
		page,
	}) => {
		await page.setViewportSize({ width: viewportWidth, height: 900 });
		const store = new MockSupabaseStore();
		const categoryName = "아주긴카테고리이름".repeat(8);
		const secondCategoryName = "두 번째 카테고리";
		store.addCategory(createMockCategory({ name: categoryName }));
		store.addCategory(createMockCategory({ name: secondCategoryName }));
		await setupSupabaseMocks(page, store);
		await gotoSafely({
			page,
			url: `/ko${PATHS.memosSetting}`,
			regexp: new RegExp(PATHS.memosSetting),
		});
		const categoryCard = page
			.getByText("메모를 묶는 카테고리를 관리해요")
			.locator("../..");
		await categoryCard
			.getByRole("button", { name: "카테고리 추가하기" })
			.click();
		const addInput = categoryCard.getByPlaceholder("새 카테고리");
		await addInput.fill("클라이언트 갱신 확인");
		await addInput.press("Enter");

		const nameButton = page.getByRole("button", {
			name: categoryName,
			exact: true,
		});
		const row = page
			.getByRole("button", { name: `${categoryName} 이름 변경` })
			.locator("..");
		await expect(nameButton).toBeVisible();
		const secondRow = categoryCard
			.getByRole("button", { name: secondCategoryName, exact: true })
			.locator("..");
		await expect(secondRow).toBeVisible();
		await expect(row).toHaveCSS("border-style", "solid");
		await expect(nameButton).toHaveCSS("overflow-wrap", "break-word");
		await expect
			.poll(() =>
				nameButton.evaluate(
					(element) => element.getBoundingClientRect().height,
				),
			)
			.toBeGreaterThan(30);
		const firstPosition = await row.evaluate((element) => {
			const { x, y, right, bottom } = element.getBoundingClientRect();
			return { x, y, right, bottom };
		});
		const secondPosition = await secondRow.evaluate((element) => {
			const { x, y, right, bottom } = element.getBoundingClientRect();
			return { x, y, right, bottom };
		});
		if (viewportWidth < 640) {
			expect(secondPosition.y).toBeGreaterThanOrEqual(firstPosition.bottom);
		} else {
			expect(Math.abs(secondPosition.y - firstPosition.y)).toBeLessThan(2);
			expect(secondPosition.x).toBeGreaterThanOrEqual(firstPosition.right);
		}
		expect(
			await categoryCard.evaluate(
				(element) => element.scrollWidth <= element.clientWidth,
			),
		).toBe(true);
		const renameButton = row.getByRole("button", {
			name: `${categoryName} 이름 변경`,
		});
		const deleteButton = row.getByRole("button", {
			name: `${categoryName} 삭제`,
		});
		await expect(renameButton).toBeVisible();
		await expect(deleteButton).toBeVisible();

		await renameButton.click();
		const nameInput = row.getByRole("textbox");
		await expect(nameInput).toBeFocused();
		await nameInput.press("Escape");
		await expect(nameButton).toBeVisible();
		expect(store.getAllCategories()[0]?.name).toBe(categoryName);

		await nameButton.click();
		await nameInput.fill("새 카테고리 이름");
		await nameInput.press("Enter");
		await expect(
			page.getByRole("button", { name: "새 카테고리 이름", exact: true }),
		).toBeVisible();
		await expect(
			page.getByRole("button", { name: "새 카테고리 이름 삭제" }),
		).toBeVisible();
		expect(store.getAllCategories()[0]?.name).toBe("새 카테고리 이름");

		await page.getByRole("button", { name: "새 카테고리 이름 삭제" }).click();
		await page
			.getByRole("alertdialog")
			.getByRole("button", { name: "삭제", exact: true })
			.click();
		await expect(
			page.getByRole("button", { name: "새 카테고리 이름", exact: true }),
		).toHaveCount(0);
		expect(store.getAllCategories()).toHaveLength(2);
		await expect(
			categoryCard.getByRole("button", {
				name: secondCategoryName,
				exact: true,
			}),
		).toBeVisible();
	});
}
