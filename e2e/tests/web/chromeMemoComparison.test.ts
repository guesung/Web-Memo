import { expect, test } from "../fixtures/web";

const COMPARE_PATH = "/compare/chrome-memo-extensions";
const STORE_URL =
	"https://chromewebstore.google.com/detail/web-memo/eaiojpmgklfngpjddhoalgcpkepgkclh";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("크롬 메모 확장 비교", () => {
	for (const language of ["ko", "en"] as const) {
		test(`${language} 본문·표·출처·설치 링크가 현지화된다.`, async ({
			page,
		}) => {
			const response = await page.goto(`/${language}${COMPARE_PATH}`);
			expect(response?.status()).toBe(200);
			const content = page.locator(".landing");
			await expect(content.locator("section")).toHaveCount(6);
			await expect(content.locator("h1")).toHaveCount(1);
			await expect(content.locator("table thead th")).toHaveCount(6);
			await expect(content.locator("table tbody tr")).toHaveCount(8);
			await expect(content.locator("table tbody td")).toHaveCount(40);
			await expect(content.locator("table caption")).toHaveText(/\S/);
			await expect(content.locator('th[scope="row"]')).toHaveCount(8);
			await expect(content.locator('th[scope="col"]')).toHaveCount(6);
			const text = await content.innerText();
			if (language === "en") {
				expect(text).not.toMatch(/[가-힣]/);
				await expect(content.locator("table")).toContainText("Not verified");
				await expect(content.locator("table .sr-only").first()).toContainText(
					/Supported|Partial|Not verified/,
				);
			} else {
				expect(text).toMatch(/크롬 메모 확장/);
				await expect(content.locator("table")).toContainText("확인 못 함");
			}
			const sourceLinks = content.locator(
				'a[target="_blank"]:not([data-install-from])',
			);
			expect(await sourceLinks.count()).toBeGreaterThanOrEqual(5);
			for (const link of await sourceLinks.all()) {
				await expect(link).toHaveAttribute("href", /^https:\/\//);
				await expect(link).toHaveAttribute("rel", /noopener/);
				await expect(link).toHaveAttribute("rel", /noreferrer/);
			}
			await expect(
				content.locator('a[href="mailto:gueit214@naver.com"]'),
			).toHaveCount(1);
			for (const position of ["recommendation", "final"]) {
				const install = content.locator(
					`a[data-install-position="${position}"]`,
				);
				await expect(install).toHaveAttribute(
					"data-install-from",
					COMPARE_PATH,
				);
				await expect(install).toHaveAttribute("href", STORE_URL);
			}
		});
	}

	test("영문 랜딩 푸터에서 영문 비교 페이지로 이동한다.", async ({ page }) => {
		await page.goto("/en/introduce");
		const link = page.locator("footer").getByRole("link", {
			name: "Compare Chrome note-taking extensions",
		});
		await expect(link).toHaveAttribute("href", `/en${COMPARE_PATH}`);
		await link.click();
		await expect(page).toHaveURL(`/en${COMPARE_PATH}`);
		await expect(page.locator(".landing table")).toBeVisible();
	});

	test("390px 라이트·다크에서 표만 가로 스크롤되고 기준 열은 고정된다.", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto(`/en${COMPARE_PATH}`);
		await page.locator('a[href="#comparison"]').click();
		await expect(page).toHaveURL(`/en${COMPARE_PATH}#comparison`);
		for (const dark of [false, true]) {
			await page.evaluate(
				(enabled) => document.documentElement.classList.toggle("dark", enabled),
				dark,
			);
			const geometry = await page.locator("table").evaluate((table) => {
				const container = table.parentElement;
				const criterion = table.querySelector('tbody th[scope="row"]');
				if (!container || !criterion) throw new Error("비교표 구조가 없습니다");
				container.scrollLeft = 0;
				const before = criterion.getBoundingClientRect().left;
				container.scrollLeft = 240;
				return {
					overflow: document.documentElement.scrollWidth > window.innerWidth,
					canScroll: container.scrollWidth > container.clientWidth,
					scrolled: container.scrollLeft,
					before,
					after: criterion.getBoundingClientRect().left,
					position: getComputedStyle(criterion).position,
				};
			});
			expect(geometry.overflow).toBe(false);
			expect(geometry.canScroll).toBe(true);
			expect(geometry.scrolled).toBeGreaterThan(0);
			expect(geometry.position).toBe("sticky");
			expect(Math.abs(geometry.after - geometry.before)).toBeLessThanOrEqual(1);
		}
	});
});
