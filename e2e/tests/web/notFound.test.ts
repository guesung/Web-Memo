import { expect, test } from "../fixtures/web";

/** 없는 주소에서 보여야 하는 언어별 404 문구입니다. */
const NOT_FOUND_TEXTS = {
	ko: {
		title: "페이지를 찾지 못했어요",
		description: "주소가 정확한지 확인해 주세요",
		backToHome: "홈으로 가기",
	},
	en: {
		title: "We couldn't find this page",
		description: "Check that the address is correct",
		backToHome: "Go to home",
	},
} as const;

// 비로그인 상태의 화면을 검증하므로 setup이 저장한 로그인 세션을 쓰지 않는다.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("404 화면", () => {
	for (const language of ["ko", "en"] as const) {
		test(`${language}/없는-경로는 헤더와 함께 친절한 404 안내를 보여준다.`, async ({
			page,
		}) => {
			const texts = NOT_FOUND_TEXTS[language];

			await page.goto(`/${language}/not-exist-page`);

			await expect(page.locator("header")).toBeVisible();
			// 본문 여백이 body 밖으로 겹쳐 빠지면 top 없는 고정 헤더가 같이 밀려 내려간다.
			expect((await page.locator("header").boundingBox())?.y).toBe(0);
			await expect(
				page.getByRole("heading", { name: texts.title }),
			).toBeVisible();
			await expect(page.getByText(texts.description)).toBeVisible();
			await expect(
				page.getByRole("link", { name: texts.backToHome }),
			).toHaveAttribute("href", "/");
		});
	}
});
