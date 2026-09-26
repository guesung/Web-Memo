import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import {
	findSidePanelPage,
	login,
	openSidePanel,
	skipGuide,
} from "../tests/lib";
import { guardUnhandledSupabaseRequests } from "../tests/lib/mocks";
import { DEMO_ARTICLE_URL, DEMO_CONTENT, DEMO_VIDEO_URL } from "./demoData";
import { setupDemoRoutes } from "./demoRoutes";
import { closeInstallTab, launchExtensionContext } from "./extensionContext";
import {
	captureDashboard,
	captureSidePanelScene,
	dragSidePanelDivider,
	expectMemoTextareaFullyVisible,
	saveMemoSourceBox,
	waitForSidePanelMemo,
} from "./sceneCapture";

test.describe.configure({ mode: "serial" });

for (const language of ["ko", "en"] as const) {
	test(`${language} 스토어 스크린샷 원본을 캡처한다`, async () => {
		const outputDirectory = path.join(__dirname, "output", language, "raw");
		const content = DEMO_CONTENT[language];
		const context = await launchExtensionContext(language);
		const unhandledSupabaseRequests =
			await guardUnhandledSupabaseRequests(context);

		try {
			await mkdir(outputDirectory, { recursive: true });

			const page = await context.newPage();
			await setupDemoRoutes({ page, context, language });
			await closeInstallTab(context);
			await login(page);
			await context.addCookies([
				{
					name: "i18next",
					value: language,
					url: "http://localhost:3000",
					sameSite: "Strict",
				},
			]);
			await skipGuide(page);

			// 창 틀 안 콘텐츠 영역 크기(CSS px). template.html의 `.page-image`·`.side-panel-image`와 맞춰야 한다.
			await page.setViewportSize({ width: 760, height: 586 });
			await page.goto(DEMO_ARTICLE_URL);
			await openSidePanel(page);
			const sidePanelPage = await findSidePanelPage(page, 15000);
			await sidePanelPage.setViewportSize({ width: 400, height: 586 });
			// 사이드 패널은 창의 활성 탭을 따라간다. 패널 탭이 열리며 활성 탭을 가져갔으므로 기사 탭을 되돌린다.
			await page.bringToFront();

			// 1~3번 장: 메모가 주인공이므로 요약 영역을 줄여 메모 칸이 패널의 절반 이상을 차지하게 한다.
			// 23%는 요약 안내 문구와 버튼이 잘리지 않고 들어가는 가장 낮은 비율이다(20%면 탭 목록 밑으로 잘린다).
			await waitForSidePanelMemo({
				sidePanelPage,
				pageTitle: await page.title(),
				memo: content.articleMemo.memo,
			});
			await dragSidePanelDivider({ sidePanelPage, tabRatio: 23 });
			await expectMemoTextareaFullyVisible(sidePanelPage);
			await captureSidePanelScene({
				page,
				sidePanelPage,
				outputDirectory,
				name: "article",
			});
			await saveMemoSourceBox({
				sidePanelPage,
				outputPath: path.join(outputDirectory, "article-memo-source.json"),
			});

			// 5번 장: 요약이 주인공이므로 경계를 확장 기본 비율(60%)로 되돌린다.
			await page.goto(DEMO_VIDEO_URL);
			await expect(page.locator("img")).toHaveJSProperty("complete", true);
			await waitForSidePanelMemo({
				sidePanelPage,
				pageTitle: await page.title(),
				memo: content.videoMemo.memo,
			});
			await dragSidePanelDivider({ sidePanelPage, tabRatio: 60 });
			const summaryLabel = await sidePanelPage.evaluate(() =>
				chrome.i18n.getMessage("summary_generate_label"),
			);
			await sidePanelPage.getByRole("button", { name: summaryLabel }).click();
			await expect(sidePanelPage.getByRole("tabpanel")).toContainText(
				content.summaryChunks.at(-1)?.replace(/^- /, "") ?? "",
			);
			await captureSidePanelScene({
				page,
				sidePanelPage,
				outputDirectory,
				name: "video",
			});

			await captureDashboard({
				page,
				language,
				outputPath: path.join(outputDirectory, "dashboard.png"),
			});
		} finally {
			await context.close();
		}

		expect(unhandledSupabaseRequests, "목 없는 Supabase 요청").toEqual([]);
	});
}
