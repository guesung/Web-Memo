import type { Page } from "@playwright/test";
import { PATHS } from "@web-memo/shared/constants";
import { expect, test } from "../fixtures/web";
import { gotoSafely, LANGUAGE } from "../lib";
import {
	createMockMemo,
	MockBlogReadingStore,
	MockSupabaseStore,
	resetMockIds,
	setupBlogReadingMocks,
	setupSupabaseMocks,
} from "../lib/mocks";

/** 목록 한 페이지의 글 수(BLOG_READING_PAGE_SIZE). */
const PAGE_SIZE = 30;

/** 블로그 정주행 화면을 목 데이터로 연다. */
const openBlogReading = async ({
	page,
	memoStore,
	blogStore,
}: {
	page: Page;
	memoStore: MockSupabaseStore;
	blogStore: MockBlogReadingStore;
}) => {
	await setupSupabaseMocks(page, memoStore);
	await setupBlogReadingMocks(page, blogStore);
	await gotoSafely({
		page,
		url: `${LANGUAGE}${PATHS.memosBlogs}`,
		regexp: new RegExp(PATHS.memosBlogs),
	});
};

const articleRows = (page: Page) =>
	page.getByRole("list", { name: "Blog posts" }).getByRole("listitem");

test.describe("블로그 정주행 (Mocked)", () => {
	let memoStore: MockSupabaseStore;
	let blogStore: MockBlogReadingStore;

	test.beforeEach(() => {
		resetMockIds();
		memoStore = new MockSupabaseStore();
		blogStore = new MockBlogReadingStore(memoStore);
	});

	test("사이드바에서 블로그 정주행으로 이동한다.", async ({ page }) => {
		blogStore.addArticles({ blogId: "toss", count: 3, titlePrefix: "토스 글" });
		blogStore.subscribe("toss");
		await setupSupabaseMocks(page, memoStore);
		await setupBlogReadingMocks(page, blogStore);
		await gotoSafely({
			page,
			url: `${LANGUAGE}${PATHS.memos}`,
			regexp: new RegExp(PATHS.memos),
		});

		await page.getByRole("link", { name: "Blog Reading" }).click();

		await expect(page).toHaveURL(new RegExp(`${PATHS.memosBlogs}$`));
		await expect(
			page.getByRole("heading", { name: "Blog Reading" }),
		).toBeVisible();
	});

	test("구독이 없으면 블로그 선택 안내가 뜨고, 구독하면 목록이 나온다.", async ({
		page,
	}) => {
		blogStore.addArticles({ blogId: "toss", count: 3, titlePrefix: "토스 글" });
		await openBlogReading({ page, memoStore, blogStore });

		await expect(
			page.getByText("You have not subscribed to any blog yet"),
		).toBeVisible();

		await page.getByRole("button", { name: "Choose blogs" }).first().click();
		await page.getByRole("button", { name: "Toss Subscribe" }).click();
		await page.keyboard.press("Escape");

		await expect(articleRows(page)).toHaveCount(3);
	});

	test("전체 수집이 끝나면 확정 총 글 수와 30개 단위 쪽 이동을 보여준다.", async ({
		page,
	}) => {
		blogStore.addArticles({
			blogId: "toss",
			count: 65,
			titlePrefix: "토스 글",
		});
		blogStore.subscribe("toss");
		// 쪽 이동 이벤트 로깅이 예외를 던지면 화면 동작이 깨지므로 페이지 오류를 모은다.
		const pageErrors: Error[] = [];
		page.on("pageerror", (error) => pageErrors.push(error));
		await openBlogReading({ page, memoStore, blogStore });

		await expect(articleRows(page)).toHaveCount(PAGE_SIZE);
		await expect(
			page.getByText("Collected 65 public posts in total."),
		).toBeVisible();
		await expect(page.getByText("1–30 of 65")).toBeVisible();
		await expect(page.getByText("Page 1 of 3")).toBeVisible();
		// 기본 정렬은 과거부터라 가장 오래된 글이 맨 위다.
		await expect(articleRows(page).first()).toContainText("토스 글 001");
		await expect(page.getByRole("button", { name: "Previous" })).toBeDisabled();

		await page.getByRole("button", { name: "Next", exact: true }).click();
		await expect(page.getByText("31–60 of 65")).toBeVisible();
		await expect(articleRows(page).first()).toContainText("토스 글 031");

		await page.getByRole("button", { name: "Next", exact: true }).click();
		await expect(page.getByText("61–65 of 65")).toBeVisible();
		await expect(articleRows(page)).toHaveCount(5);
		await expect(
			page.getByRole("button", { name: "Next", exact: true }),
		).toBeDisabled();

		await page.getByRole("button", { name: "Previous" }).click();
		await expect(page.getByText("31–60 of 65")).toBeVisible();
		expect(pageErrors).toEqual([]);
	});

	test("최신순으로 바꾸면 첫 쪽부터 최신 글이 먼저 나온다.", async ({
		page,
	}) => {
		blogStore.addArticles({
			blogId: "toss",
			count: 65,
			titlePrefix: "토스 글",
		});
		blogStore.subscribe("toss");
		await openBlogReading({ page, memoStore, blogStore });
		await page.getByRole("button", { name: "Next", exact: true }).click();
		await expect(page.getByText("31–60 of 65")).toBeVisible();

		await page.getByRole("combobox", { name: "Sort posts" }).click();
		await page.getByRole("option", { name: "Newest first" }).click();

		await expect(page.getByText("1–30 of 65")).toBeVisible();
		await expect(articleRows(page).first()).toContainText("토스 글 065");
	});

	test("수집 중에는 현재 개수만 보여주고 분모·퍼센트·총 쪽 수를 숨긴다.", async ({
		page,
	}) => {
		blogStore.addArticles({
			blogId: "daangn",
			count: 45,
			titlePrefix: "당근 글",
		});
		blogStore.subscribe("daangn");
		blogStore.setSourceStatus("daangn", { phase: "collecting" });
		await openBlogReading({ page, memoStore, blogStore });

		await expect(
			page.getByText("Found 45 so far. The total is still being confirmed."),
		).toBeVisible();
		await expect(page.getByText("Posts 1–30")).toBeVisible();
		await expect(page.getByText("Page 1", { exact: true })).toBeVisible();
		await expect(
			page.getByText("45 posts collected so far · 0 memoed"),
		).toBeVisible();
		await expect(page.getByText(/ of \d+/)).toHaveCount(0);
		await expect(page.getByText("%")).toHaveCount(0);

		// 확보한 마지막 쪽에서는 전체 쪽 수를 추정하지 않고 안내만 한다.
		await page.getByRole("button", { name: "Next", exact: true }).click();
		await expect(page.getByText("Posts 31–45")).toBeVisible();
		await expect(
			page.getByText("More earlier posts are being collected."),
		).toBeVisible();
		await expect(
			page.getByRole("button", { name: "Next", exact: true }),
		).toBeDisabled();
	});

	test("수집 중 확보한 글에 모두 메모했으면 현재 수집한 글 기준으로 안내한다.", async ({
		page,
	}) => {
		blogStore.addArticles({
			blogId: "daangn",
			count: 2,
			titlePrefix: "당근 글",
		});
		blogStore.subscribe("daangn");
		blogStore.setSourceStatus("daangn", { phase: "collecting" });
		for (const order of [1, 2]) {
			memoStore.addMemo(
				createMockMemo({
					url: `https://blog.example.com/daangn/${order}`,
					memo: "읽고 남긴 메모",
				}),
			);
		}
		await openBlogReading({ page, memoStore, blogStore });

		await expect(
			page.getByText("You have left memos on every post collected so far"),
		).toBeVisible();
		await expect(page.getByText("Collected 2 public posts")).toHaveCount(0);
	});

	test("일부 수집 실패면 수집 재개를 요청하고 접수 안내로 바뀐다.", async ({
		page,
	}) => {
		blogStore.addArticles({
			blogId: "daangn",
			count: 5,
			titlePrefix: "당근 글",
		});
		blogStore.subscribe("daangn");
		blogStore.setSourceStatus("daangn", { phase: "partial" });
		await openBlogReading({ page, memoStore, blogStore });

		await expect(
			page.getByText("Daangn · Some posts could not be fetched"),
		).toBeVisible();
		await expect(articleRows(page)).toHaveCount(5);

		await page.getByRole("button", { name: "Resume collecting" }).click();

		await expect(
			page.getByText("Requested to resume collecting", { exact: true }),
		).toBeVisible();
		await expect(page.getByText("Daangn · Resume requested")).toBeVisible();
		await expect(
			page.getByText("Requests are checked every 15 minutes"),
		).toBeVisible();
		expect(blogStore.syncRequestedBlogIds).toEqual(["daangn"]);
		await expect(
			page.getByRole("button", { name: "Resume collecting" }),
		).toHaveCount(0);
	});

	test("재개 요청이 제한(throttled)에 걸리면 다시 요청할 수 있는 시각을 알린다.", async ({
		page,
	}) => {
		blogStore.addArticles({
			blogId: "daangn",
			count: 5,
			titlePrefix: "당근 글",
		});
		blogStore.subscribe("daangn");
		blogStore.setSourceStatus("daangn", { phase: "partial" });
		blogStore.syncRequestStatus = "throttled";
		await openBlogReading({ page, memoStore, blogStore });

		await page.getByRole("button", { name: "Resume collecting" }).click();

		await expect(
			page.getByText(/You can request again after/).first(),
		).toBeVisible();
	});

	test("새로 가져온 글은 목록에 섞이지 않고, 목록 갱신을 누르면 반영된다.", async ({
		page,
	}) => {
		blogStore.addArticles({ blogId: "toss", count: 3, titlePrefix: "토스 글" });
		blogStore.subscribe("toss");
		blogStore.newArticleCount = 2;
		await openBlogReading({ page, memoStore, blogStore });

		await expect(page.getByText("2 new posts fetched")).toBeVisible();
		await expect(articleRows(page)).toHaveCount(3);

		blogStore.newArticleCount = 0;
		await page.getByRole("button", { name: "Update list" }).click();

		await expect(page.getByText("2 new posts fetched")).toHaveCount(0);
	});

	test("메모 내용이 있는 글만 완료이고 제목만 있는 메모는 완료가 아니다.", async ({
		page,
	}) => {
		blogStore.addArticles({ blogId: "toss", count: 4, titlePrefix: "토스 글" });
		blogStore.subscribe("toss");
		memoStore.addMemo(
			createMockMemo({
				url: "https://blog.example.com/toss/1",
				memo: "완료 메모",
			}),
		);
		memoStore.addMemo(
			createMockMemo({ url: "https://blog.example.com/toss/2", memo: "   " }),
		);
		memoStore.addMemo(
			createMockMemo({
				url: "https://blog.example.com/toss/3",
				memo: "",
				impression: "느낀 점만 있어요",
			}),
		);
		memoStore.addMemo(
			createMockMemo({
				url: "https://blog.example.com/toss/4",
				memo: "삭제된 메모",
				deleted_at: new Date().toISOString(),
			}),
		);
		await openBlogReading({ page, memoStore, blogStore });

		const rows = articleRows(page);
		await expect(
			rows.nth(0).getByRole("img", { name: "Memoed" }),
		).toBeVisible();
		await expect(
			rows.nth(1).getByRole("img", { name: "No memo yet" }),
		).toBeVisible();
		await expect(
			rows.nth(2).getByRole("img", { name: "Memoed" }),
		).toBeVisible();
		await expect(
			rows.nth(3).getByRole("img", { name: "No memo yet" }),
		).toBeVisible();
		await expect(
			page.getByText("4 posts · 2 to memo · 2 memoed"),
		).toBeVisible();
		// 완료 표시는 읽기 전용이라 체크박스가 아니다.
		await expect(page.getByRole("checkbox")).toHaveCount(0);
	});

	test("메모하기로 메모를 쓰면 저장 뒤 그 글이 완료로 바뀐다.", async ({
		page,
	}) => {
		blogStore.addArticles({ blogId: "toss", count: 2, titlePrefix: "토스 글" });
		blogStore.subscribe("toss");
		await openBlogReading({ page, memoStore, blogStore });
		const firstRow = articleRows(page).first();
		await expect(
			firstRow.getByRole("img", { name: "No memo yet" }),
		).toBeVisible();

		await firstRow.getByRole("button", { name: /Write memo/ }).click();

		const textarea = page.getByTestId("memo-textarea");
		await expect(textarea).toBeVisible();
		// 방금 만든 빈 메모는 아직 완료가 아니다.
		await textarea.fill("읽고 남기는 메모");
		await page.waitForResponse(
			(response) =>
				response.url().includes("/rest/v1/memo") &&
				response.request().method() === "PATCH",
		);
		await page.getByTestId("memo-close-button").click();

		await expect(firstRow.getByRole("img", { name: "Memoed" })).toBeVisible();
		await expect(
			firstRow.getByRole("button", { name: /View memo/ }),
		).toBeVisible();
	});

	test("원문 링크는 새 탭으로 열리고 방문만으로 완료가 바뀌지 않는다.", async ({
		page,
	}) => {
		blogStore.addArticles({ blogId: "toss", count: 1, titlePrefix: "토스 글" });
		blogStore.subscribe("toss");
		const pageErrors: Error[] = [];
		page.on("pageerror", (error) => pageErrors.push(error));
		await openBlogReading({ page, memoStore, blogStore });

		const link = articleRows(page)
			.first()
			.getByRole("link", { name: /Open original/ });
		await expect(link).toHaveAttribute(
			"href",
			"https://blog.example.com/toss/1",
		);
		await expect(link).toHaveAttribute("target", "_blank");
		await expect(link).toHaveAttribute("rel", /noopener/);
		// 외부 사이트로 나가지 않도록 이동만 막고 클릭 핸들러(원문 열기 이벤트 로깅)를 통과시킨다.
		await link.evaluate((element) =>
			element.addEventListener("click", (event) => event.preventDefault()),
		);
		await link.click();
		expect(pageErrors).toEqual([]);
		await expect(
			articleRows(page).first().getByRole("img", { name: "No memo yet" }),
		).toBeVisible();
	});

	test("두 블로그를 구독하면 출처 필터로 한 블로그만 요청한다.", async ({
		page,
	}) => {
		blogStore.addArticles({ blogId: "toss", count: 3, titlePrefix: "토스 글" });
		blogStore.addArticles({
			blogId: "daangn",
			count: 2,
			titlePrefix: "당근 글",
		});
		blogStore.subscribe("toss");
		blogStore.subscribe("daangn");
		await openBlogReading({ page, memoStore, blogStore });
		await expect(articleRows(page)).toHaveCount(5);

		await page.getByRole("button", { name: "Daangn", exact: true }).click();

		await expect(articleRows(page)).toHaveCount(2);
		expect(blogStore.pageRequests.at(-1)?.p_blog_id).toBe("daangn");
	});

	test("구독 직후 목록 조회가 실패하면 구독 저장 사실과 다시 시도를 보여준다.", async ({
		page,
	}) => {
		blogStore.addArticles({ blogId: "toss", count: 3, titlePrefix: "토스 글" });
		blogStore.subscribe("toss");
		blogStore.isPageRequestFailing = true;
		await openBlogReading({ page, memoStore, blogStore });

		await expect(page.getByText("Could not load the post list")).toBeVisible();
		await expect(page.getByText("Your subscription is saved.")).toBeVisible();

		blogStore.isPageRequestFailing = false;
		await page.getByRole("button", { name: "Try again" }).click();

		await expect(articleRows(page)).toHaveCount(3);
	});

	test("전체 수집 뒤 새 글 확인이 실패해도 기존 전체 목록을 유지한다.", async ({
		page,
	}) => {
		blogStore.addArticles({ blogId: "toss", count: 3, titlePrefix: "토스 글" });
		blogStore.subscribe("toss");
		blogStore.setSourceStatus("toss", { phase: "refresh_failed" });
		await openBlogReading({ page, memoStore, blogStore });

		await expect(articleRows(page)).toHaveCount(3);
		await expect(
			page.getByText("Toss · Could not check for new posts"),
		).toBeVisible();
		await expect(
			page.getByText("Collected 3 public posts in total."),
		).toBeVisible();
	});

	test("360px 화면에서도 가로 스크롤이 생기지 않는다.", async ({ page }) => {
		await page.setViewportSize({ width: 360, height: 740 });
		blogStore.addArticles({
			blogId: "toss",
			count: 30,
			titlePrefix: "아주 긴 제목의 토스 글 아주 긴 제목의 토스 글 아주 긴 제목",
		});
		blogStore.subscribe("toss");
		await openBlogReading({ page, memoStore, blogStore });
		await expect(articleRows(page)).toHaveCount(PAGE_SIZE);

		const hasHorizontalScroll = await page.evaluate(
			() =>
				document.documentElement.scrollWidth >
				document.documentElement.clientWidth,
		);

		expect(hasHorizontalScroll).toBe(false);
	});
});
