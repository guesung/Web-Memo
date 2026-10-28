import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/web";
import { MockSupabaseStore, setupSupabaseMocks } from "../lib/mocks";

const LANGUAGES = [
	{
		language: "ko",
		step: "저장 완료",
		caption: "입력 내용이 자동 저장됩니다.",
		title: "좋은 생각은 읽는 동안 떠오른다",
		heroTitle: "글 읽으며 메모하세요",
		heroSubtitle:
			"글을 읽다가 떠오른 생각을 사이드 패널에 적어요.\n페이지 제목과 주소는 자동으로 기록됩니다.",
		demoTitle: "웹 메모 미리 보기",
		panelStep: "패널 열기",
	},
	{
		language: "en",
		step: "Saved",
		caption: "Your memo is saved automatically.",
		title: "Good ideas arrive while you read",
		heroTitle: "Take notes while reading",
		heroSubtitle:
			"Write down thoughts in the side panel as you read.\nThe page title and URL are saved automatically.",
		demoTitle: "Preview Web Memo",
		panelStep: "Open panel",
	},
] as const;

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("소개 페이지 메모 사용 흐름 데모", () => {
	test.beforeEach(async ({ page }) => {
		await setupSupabaseMocks(page, new MockSupabaseStore());
	});

	for (const {
		language,
		step,
		caption,
		title,
		heroTitle,
		heroSubtitle,
		demoTitle,
		panelStep,
	} of LANGUAGES) {
		test(`${language} 소개 문구와 설치 링크가 현재 제공 상태에 맞다`, async ({
			page,
		}) => {
			await page.goto(`/${language}${PATHS.introduce}`);
			await expect(page.getByRole("heading", { level: 1 })).toHaveText(
				heroTitle,
			);
			await expect(page.locator("h1 + p")).toHaveText(heroSubtitle);
			await expect(page.locator("h1 + p")).toHaveCSS("white-space", "pre-line");
			await expect(page.locator("#demo h2")).toHaveText(demoTitle);
			await expect(
				page.locator("#demo").getByRole("button", { name: panelStep }),
			).toBeVisible();
			await expect(page.locator('a[href*="apps.apple.com"]')).toHaveCount(0);
		});
		test(`${language} 단계 버튼으로 자동 저장 장면을 볼 수 있다`, async ({
			page,
		}) => {
			await page.goto(`/${language}${PATHS.introduce}`);
			const demo = page.locator("#demo");
			await expect(demo.getByText(title).first()).toBeVisible();
			const stepButton = demo.getByRole("button", { name: step });
			await stepButton.click();
			await expect(stepButton).toBeFocused();
			await expect(demo.getByTestId("demo-scene")).toHaveAttribute(
				"data-stage",
				"4",
			);
			await expect(demo.getByText(caption)).toBeVisible();
			await expect(demo.getByTestId("demo-saved")).toBeAttached();
			await expect(demo.getByTestId("demo-scene")).toHaveAttribute(
				"data-stage",
				"0",
				{ timeout: 5000 },
			);
		});
	}

	test("동작 줄이기 설정에서는 자동 전환하지 않고 단계 조작이 가능하다", async ({
		page,
	}) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.goto(`/ko${PATHS.introduce}`);
		const demo = page.locator("#demo");
		await expect(demo.getByRole("button", { name: "재생" })).toBeDisabled();
		await page.waitForTimeout(3200);
		await expect(demo.getByTestId("demo-scene")).toHaveAttribute(
			"data-stage",
			"0",
		);
		await demo.getByRole("button", { name: "메모 입력" }).click();
		await expect(demo.getByTestId("demo-scene")).toHaveAttribute(
			"data-stage",
			"3",
		);
		await page.waitForTimeout(3500);
		await expect(demo.getByTestId("demo-scene")).toHaveAttribute(
			"data-stage",
			"3",
		);
	});

	test("사용자가 정지하면 포인터와 포커스가 떠나도 장면이 유지된다", async ({
		page,
	}) => {
		await page.emulateMedia({ reducedMotion: "no-preference" });
		await page.goto(`/ko${PATHS.introduce}`);
		const demo = page.locator("#demo");
		await demo.getByRole("button", { name: "패널 열기" }).click();
		await demo.getByRole("button", { name: "정지" }).click();
		await page.mouse.move(0, 0);
		await page.keyboard.press("Tab");
		await page.waitForTimeout(3200);
		await expect(demo.getByTestId("demo-scene")).toHaveAttribute(
			"data-stage",
			"2",
		);
		await demo.getByRole("button", { name: "재생" }).click();
		await expect(demo.getByTestId("demo-scene")).toHaveAttribute(
			"data-stage",
			"3",
			{ timeout: 4000 },
		);
	});
	test("마우스를 올려도 진행하고 focus 동안 멈췄다가 이어진다", async ({
		page,
	}) => {
		await page.emulateMedia({ reducedMotion: "no-preference" });
		await page.goto(`/ko${PATHS.introduce}`);
		const demo = page.locator("#demo");
		const scene = demo.getByTestId("demo-scene");
		await demo.getByRole("button", { name: "글 읽기" }).click();
		await expect(scene).toHaveAttribute("data-stage", "1", { timeout: 5000 });
		await demo.hover();
		await expect(scene).toHaveAttribute("data-stage", "2", { timeout: 4000 });
		await page.mouse.move(0, 0);
		await demo.getByRole("button", { name: "패널 열기" }).focus();
		await page.waitForTimeout(3100);
		await expect(scene).toHaveAttribute("data-stage", "2");
		await demo
			.getByRole("button", { name: "패널 열기" })
			.evaluate((button: HTMLElement) => button.blur());
		await expect(scene).toHaveAttribute("data-stage", "3", { timeout: 4000 });
	});
	test("수동 단계 선택과 재생·정지만 데모 조작 이벤트로 기록한다", async ({
		page,
	}) => {
		const loggedEvents: Array<Promise<{ action: string; stage: string }>> = [];
		page.on("console", (message) => {
			if (message.text().startsWith("[analytics] introduce_demo_control")) {
				loggedEvents.push(
					message
						.args()[1]
						.jsonValue()
						.then((params: { action: string; stage: string }) => ({
							action: params.action,
							stage: params.stage,
						})),
				);
			}
		});
		await page.addInitScript(() => {
			const events: Array<{ action: string; stage: string }> = [];
			Object.defineProperty(window, "__demoControlEvents", { value: events });
			const capture = (
				command: string,
				name: string,
				params: { action?: string; stage?: string },
			) => {
				if (command === "event" && name === "introduce_demo_control") {
					events.push({
						action: params.action ?? "",
						stage: params.stage ?? "",
					});
				}
			};
			Object.defineProperty(window, "gtag", {
				configurable: true,
				get: () => capture,
				set: () => undefined,
			});
		});
		await page.emulateMedia({ reducedMotion: "no-preference" });
		await page.goto(`/ko${PATHS.introduce}`);
		const demo = page.locator("#demo");
		await demo.getByRole("button", { name: "저장 완료" }).click();
		await demo.getByRole("button", { name: "저장 완료" }).click();
		await demo.getByRole("button", { name: "재생" }).click();
		await demo.getByRole("button", { name: "정지" }).click();
		await demo.getByRole("button", { name: "재생" }).click();
		await demo.getByRole("button", { name: "정지" }).click();
		await expect
			.poll(async () => {
				const consoleEvents = await Promise.all(loggedEvents);
				if (consoleEvents.length > 0) return consoleEvents;
				return page.evaluate(
					() =>
						(
							window as Window & {
								__demoControlEvents?: Array<{ action: string; stage: string }>;
							}
						).__demoControlEvents,
				);
			})
			.toEqual([
				{ action: "select_step", stage: "saved" },
				{ action: "select_step", stage: "saved" },
				{ action: "pause", stage: "saved" },
				{ action: "play", stage: "saved" },
				{ action: "pause", stage: "saved" },
			]);
	});
	test("메모 타이핑은 hover 중 계속되고 focus 동안 현재 분량을 보존한다", async ({
		page,
	}) => {
		await page.emulateMedia({ reducedMotion: "no-preference" });
		await page.goto(`/ko${PATHS.introduce}`);
		const demo = page.locator("#demo");
		const memo = demo.getByTestId("demo-memo-text");
		const writeStep = demo.getByRole("button", { name: "메모 입력" });
		await writeStep.click();
		await expect(writeStep).toBeFocused();
		await expect
			.poll(async () => (await memo.textContent())?.length ?? 0)
			.toBeGreaterThan(5);
		const beforeRestartLength = (await memo.textContent())?.length ?? 0;
		await writeStep.click();
		await expect
			.poll(async () => (await memo.textContent())?.length ?? 0)
			.toBeLessThan(beforeRestartLength);
		await expect
			.poll(async () => (await memo.textContent())?.length ?? 0)
			.toBeGreaterThan(5);
		const beforeHoverLength = (await memo.textContent())?.length ?? 0;
		await demo.hover();
		await expect
			.poll(async () => (await memo.textContent())?.length ?? 0)
			.toBeGreaterThan(beforeHoverLength);
		await demo.getByRole("button", { name: "저장 완료" }).focus();
		const pausedText = await memo.textContent();
		await page.mouse.move(0, 0);
		await page.waitForTimeout(500);
		await expect(memo).toHaveText(pausedText ?? "");
		await demo
			.getByRole("button", { name: "저장 완료" })
			.evaluate((button: HTMLElement) => button.blur());
		await expect
			.poll(async () => (await memo.textContent())?.length ?? 0)
			.toBeGreaterThan((pausedText ?? "").length);
	});
});
