import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import {
	findSidePanelPage,
	login,
	openSidePanel,
	skipGuide,
} from "../tests/lib";
import { guardUnhandledSupabaseRequests } from "../tests/lib/mocks";
import { DEMO_CONTENT } from "./demoData";
import { gotoDemoPage, setupDemoRoutes } from "./demoRoutes";
import { closeInstallTab, launchExtensionContext } from "./extensionContext";
import {
	captureDashboard,
	captureSidePanelScene,
	saveMemoSourceBox,
	waitForSidePanelMemo,
} from "./sceneCapture";
import {
	dragSidePanelDivider,
	expectMemoFieldsFullyVisible,
	fitMemoFieldToContent,
} from "./sidePanelLayout";

test.describe.configure({ mode: "serial" });

for (const language of ["ko", "en"] as const) {
	test(`${language} 스토어 스크린샷 원본을 캡처한다`, async ({ browser }) => {
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
			// 사이드 패널은 로그인 뒤의 웹 메모 탭에서 먼저 열고, 같은 탭을 기사로 옮긴다. 실제 기사(brunch)에서 바로 열면
			// 패널 탭이 앞으로 오며 기사 탭이 뒤로 밀리는 사이에 기사 탭이 원인 모르게 닫히는 일이 간헐적으로 있었다.
			await openSidePanel(page);
			const sidePanelPage = await findSidePanelPage(page, 15000);
			await sidePanelPage.setViewportSize({ width: 400, height: 586 });
			// 사이드 패널은 창의 활성 탭을 따라간다. 패널 탭이 열리며 활성 탭을 가져갔으므로 웹 메모 탭을 되돌린다.
			await page.bringToFront();
			await gotoDemoPage({ page, demoPage: content.articlePage });

			// 1~3번 장: 메모가 주인공이므로 요약 영역을 줄여 메모 칸(느낀 점을 켠 언어는 느낀 점까지)이 잘리지 않게 한다.
			// 23%는 요약 안내 문구와 버튼이 잘리지 않고 들어가는 가장 낮은 비율이다(20%면 탭 목록 밑으로 잘린다).
			const articleTitle = await page.title();
			await waitForSidePanelMemo({
				sidePanelPage,
				pageTitle: articleTitle,
				memo: content.articleMemo.memo,
			});
			await dragSidePanelDivider({ sidePanelPage, tabRatio: 23 });
			await fitMemoFieldToContent(sidePanelPage);
			await expectMemoFieldsFullyVisible(sidePanelPage);
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

			// 실제 페이지의 탭 제목은 저장된 메모 제목과 다를 수 있으므로 합성 단계에 넘긴다.
			await writeFile(
				path.join(outputDirectory, "page-titles.json"),
				JSON.stringify({ article: articleTitle }),
			);
			await captureDashboard({
				page,
				language,
				outputPath: path.join(outputDirectory, "dashboard.png"),
			});
		} finally {
			await context.close();
		}

		expect(unhandledSupabaseRequests, "목 없는 Supabase 요청").toEqual([]);

		const categoryContext = await browser.newContext({
			locale: language === "ko" ? "ko-KR" : "en-US",
			deviceScaleFactor: 1,
		});
		const unhandledCategoryRequests =
			await guardUnhandledSupabaseRequests(categoryContext);
		try {
			const categoryPage = await categoryContext.newPage();
			await setupDemoRoutes({
				page: categoryPage,
				context: categoryContext,
				language,
			});
			await login(categoryPage);
			await categoryContext.addCookies([
				{
					name: "i18next",
					value: language,
					url: "http://localhost:3000",
					sameSite: "Strict",
				},
			]);
			await skipGuide(categoryPage);
			await captureDashboard({
				page: categoryPage,
				language,
				categoryName: content.categories[0].name,
				outputPath: path.join(outputDirectory, "category-dashboard.png"),
			});
		} finally {
			await categoryContext.close();
		}

		expect(unhandledCategoryRequests, "목 없는 Supabase 요청").toEqual([]);
	});
}
