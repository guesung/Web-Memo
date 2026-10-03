import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/web";
import { gotoSafely } from "../lib";
import { MockSupabaseStore, setupSupabaseMocks } from "../lib/mocks";

/** 목 저장소에 카테고리를 만든 뒤 실제 메뉴·포커스 흐름을 검증한다. */
test("사이드바 카테고리 메뉴에서 이름 편집을 열고 취소·저장한다", async ({
	page,
}) => {
	const store = new MockSupabaseStore();
	await setupSupabaseMocks(page, store);
	await gotoSafely({
		page,
		url: `/ko${PATHS.memos}`,
		regexp: new RegExp(PATHS.memos),
	});

	const sidebar = page.locator('[data-sidebar="sidebar"]');
	await sidebar.getByRole("button", { name: "카테고리 추가하기" }).click();
	const addInput = sidebar.getByPlaceholder("카테고리 추가하기");
	await addInput.fill("테스트 카테고리");
	await addInput.press("Enter");

	const categoryLink = sidebar.getByRole("link", { name: /테스트 카테고리/ });
	await expect(categoryLink).toBeVisible();
	await categoryLink.click({ button: "right" });
	await page.getByRole("menuitem", { name: "이름 변경" }).click();

	const nameInput = sidebar.locator('#category input[value="테스트 카테고리"]');
	await expect(nameInput).toBeVisible();
	await expect(nameInput).toBeFocused();
	await nameInput.press("Escape");
	await expect(categoryLink).toBeVisible();
	expect(store.getAllCategories()[0]?.name).toBe("테스트 카테고리");

	await categoryLink.click({ button: "right" });
	await page.getByRole("menuitem", { name: "이름 변경" }).click();
	const reopenedInput = sidebar.locator(
		'#category input[value="테스트 카테고리"]',
	);
	await expect(reopenedInput).toBeFocused();
	let shouldFailUpdate = true;
	await page.route("**/rest/v1/category**", async (route) => {
		if (route.request().method() !== "PATCH" || !shouldFailUpdate) {
			await route.fallback();
			return;
		}

		shouldFailUpdate = false;
		await route.fulfill({
			status: 400,
			contentType: "application/json",
			body: JSON.stringify({
				code: "PGRST_TEST",
				message: "Mock save failure",
			}),
		});
	});
	await reopenedInput.fill("수정한 카테고리");
	await reopenedInput.press("Enter");
	await expect(reopenedInput).toBeVisible();
	await expect(
		page.getByText("저장하지 못했어요", { exact: true }),
	).toBeVisible();
	await reopenedInput.press("Enter");
	await expect(
		sidebar.getByRole("link", { name: /수정한 카테고리/ }),
	).toBeVisible();
	expect(store.getAllCategories()[0]?.name).toBe("수정한 카테고리");
});
