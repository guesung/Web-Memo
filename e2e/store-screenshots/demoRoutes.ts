import { readFile } from "node:fs/promises";
import path from "node:path";
import type { BrowserContext, Page } from "@playwright/test";
import {
	createMockCategory,
	createMockMemo,
	createMockSetting,
	MockSupabaseStore,
	setupSupabaseMocks,
} from "../tests/lib/mocks";
import {
	DEMO_ARTICLE_URL,
	DEMO_CONTENT,
	type TStoreLanguage,
} from "./demoData";

/**
 * 대시보드 탭의 브라우저 시계를 앞당기는 양.
 * @description 서버가 심은 카테고리 캐시(5분)를 넘겨야 한다(sceneCapture.ts의 captureDashboard).
 * 메모 시각도 이만큼 앞당긴 시각을 기준으로 만들어 카드의 "n분 전"이 demoData의 값과 맞게 한다.
 */
export const DASHBOARD_CLOCK_OFFSET_MS = 10 * 60 * 1000;

/**
 * 시연 데이터를 목 저장소에 넣고, 시연 페이지·과거 메모 API를 가로챈다.
 * @description 로그인(`/auth/v1`)만 실제로 나간다. 메모·카테고리 REST는 목 저장소가 받는다.
 * 과거 메모 판정 API는 웹 서버가 실제 계정 데이터를 읽으므로 빈 응답으로 막는다.
 * 시연 기사 주소는 실제 사이트로 나가지 않고 로컬에서 만든 HTML로 응답한다.
 */
export const setupDemoRoutes = async ({
	page,
	context,
	language,
}: IFSetupDemoRoutesParams) => {
	const content = DEMO_CONTENT[language];
	const store = new MockSupabaseStore();
	const demoArticleHtml = await readFile(
		path.join(__dirname, "demoArticle.html"),
		"utf8",
	);
	const demoMemos = [
		content.articleMemo,
		content.ideaMemo,
		...content.otherMemos,
	];
	const now = Date.now();

	store.setSetting(createMockSetting());
	for (const category of content.categories) {
		const memoCount = demoMemos.filter(
			(demoMemo) => demoMemo.categoryId === category.id,
		).length;

		store.addCategory(
			createMockCategory({ ...category, memo_count: memoCount }),
		);
	}
	for (const demoMemo of demoMemos) {
		const updatedAt = new Date(
			now + DASHBOARD_CLOCK_OFFSET_MS - demoMemo.minutesAgo * 60 * 1000,
		).toISOString();

		store.addMemo(
			createMockMemo({
				url: demoMemo.url,
				title: demoMemo.title,
				memo: demoMemo.memo,
				category_id: demoMemo.categoryId,
				isWish: demoMemo.isWish ?? false,
				isStar: demoMemo.isStar ?? false,
				created_at: updatedAt,
				updated_at: updatedAt,
			}),
		);
	}

	await setupSupabaseMocks(page, store);
	await context.route("http://localhost:3000/api/past-memo", (route) =>
		route.fulfill({ json: { duplicate: null, related: [] } }),
	);
	await context.route(
		`${new URL(DEMO_ARTICLE_URL).origin}/**`,
		async (route) => {
			const requestUrl = route.request().url();

			if (requestUrl.includes("/__fonts/")) {
				await route.fulfill({
					path: path.join(
						__dirname,
						"../../apps/web/src/fonts/PretendardVariable.woff2",
					),
				});
				return;
			}
			if (requestUrl !== DEMO_ARTICLE_URL) {
				await route.fulfill({ status: 404 });
				return;
			}

			await route.fulfill({
				contentType: "text/html; charset=utf-8",
				body: demoArticleHtml.replace("__LANG__", language),
			});
		},
	);
};

/** {@link setupDemoRoutes}의 인자. */
interface IFSetupDemoRoutesParams {
	/** 목 REST 라우트를 걸 기준 페이지. 라우트는 이 페이지의 컨텍스트 전체에 걸린다 */
	page: Page;
	/** 확장을 올린 브라우저 컨텍스트 */
	context: BrowserContext;
	/** 시연 데이터 언어 */
	language: TStoreLanguage;
}
