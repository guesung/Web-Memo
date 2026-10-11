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
		store.addCategory(createMockCategory({ name: categoryName }));
		await setupSupabaseMocks(page, store);
		await gotoSafely({
			page,
			url: `/ko${PATHS.memosSetting}`,
			regexp: new RegExp(PATHS.memosSetting),
		});

		const nameButton = page.getByRole("button", {
			name: categoryName,
			exact: true,
		});
		const row = page
			.getByRole("button", { name: `${categoryName} 이름 변경` })
			.locator("..");
		await expect(nameButton).toBeVisible();
		await expect(row).toHaveCSS("border-style", "solid");
		await expect(nameButton).toHaveCSS("overflow-wrap", "break-word");
		await expect
			.poll(() =>
				nameButton.evaluate(
					(element) => element.getBoundingClientRect().height,
				),
			)
			.toBeGreaterThan(30);
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
		expect(store.getAllCategories()).toHaveLength(0);
	});
}
