import type { Page, Route } from "@playwright/test";
import { SUPABASE } from "@web-memo/shared/constants";
import type {
	IFBlogArticleItem,
	IFBlogReadingCursor,
	IFBlogReadingPage,
	IFBlogReadingSummary,
	IFBlogSourceStatus,
	TBlogId,
	TBlogSyncPhase,
	TBlogSyncRequestStatus,
} from "@web-memo/shared/types";
import { getPageKey } from "@web-memo/shared/utils/url";
import type { MockSupabaseStore } from "./supabaseRoutes";

const DAY_MS = 24 * 60 * 60 * 1000;
const FIRST_PUBLISHED_AT = Date.UTC(2021, 0, 1);

/** 목 카탈로그의 글 한 건. 완료 여부는 메모 저장소에서 계산하므로 들고 있지 않다. */
type TMockBlogArticle = Omit<IFBlogArticleItem, "completed" | "memoId">;

/**
 * 블로그 정주행 RPC의 목 저장소.
 * @description 카탈로그는 이 저장소가, 메모는 `MockSupabaseStore`가 갖는다. 완료 여부는 서버 SQL처럼
 * 메모 저장소에서 계산해 응답하므로 메모 작성·삭제가 목록 완료 표시에 그대로 반영된다.
 * 서버 SQL을 두 번째로 구현한 것이라, 이 목이 지키는 것은 화면이 올바른 인자를 보내고 응답을 올바르게 그리는가까지다.
 */
export class MockBlogReadingStore {
	private articles: TMockBlogArticle[] = [];
	private subscribedBlogIds = new Set<TBlogId>();
	private sourcePatches = new Map<TBlogId, Partial<IFBlogSourceStatus>>();

	/** 수집 재개를 요청받은 블로그 */
	readonly syncRequestedBlogIds: TBlogId[] = [];
	/** 목록 조회 인자를 받은 순서대로 쌓는다 */
	readonly pageRequests: Record<string, unknown>[] = [];
	/** `request_blog_sync`가 돌려줄 결과 */
	syncRequestStatus: TBlogSyncRequestStatus = "queued";
	/** true면 목록 조회가 네트워크가 아닌 서버 오류로 실패한다 */
	isPageRequestFailing = false;
	/** 목록에 섞지 않은 새 글 수 */
	newArticleCount = 0;

	constructor(private readonly memoStore: MockSupabaseStore) {}

	/** 블로그에 글을 `count`개 만든다. 게시일은 글마다 하루씩 늦어진다. */
	addArticles({
		blogId,
		count,
		titlePrefix,
	}: {
		blogId: TBlogId;
		count: number;
		titlePrefix: string;
	}) {
		const existingCount = this.articles.filter(
			(article) => article.blogId === blogId,
		).length;

		for (let order = 1; order <= count; order++) {
			const serial = existingCount + order;
			const url = `https://blog.example.com/${blogId}/${serial}`;
			this.articles.push({
				blogId,
				providerId: String(serial).padStart(4, "0"),
				title: `${titlePrefix} ${String(serial).padStart(3, "0")}`,
				url,
				pageKey: getPageKey(url),
				publishedAt: new Date(
					FIRST_PUBLISHED_AT + (serial - 1) * DAY_MS,
				).toISOString(),
			});
		}
	}

	/** 블로그를 구독 상태로 만든다. */
	subscribe(blogId: TBlogId) {
		this.subscribedBlogIds.add(blogId);
	}

	/** 구독 여부를 바꾼다. 해제해도 글과 메모는 남는다. */
	setSubscription({ blogId, active }: { blogId: TBlogId; active: boolean }) {
		if (active) {
			this.subscribedBlogIds.add(blogId);
		} else {
			this.subscribedBlogIds.delete(blogId);
		}
	}

	/** 소스 수집 상태를 덮어쓴다. 지정하지 않은 값은 전체 수집 완료 상태를 따른다. */
	setSourceStatus(blogId: TBlogId, patch: Partial<IFBlogSourceStatus>) {
		this.sourcePatches.set(blogId, {
			...this.sourcePatches.get(blogId),
			...patch,
		});
	}

	/** 구독 중인 블로그 id. */
	getSubscribedBlogIds() {
		return Array.from(this.subscribedBlogIds);
	}

	/** 소스 한 개의 수집 상태. 기본은 전체 수집 완료다. */
	getSourceStatus(blogId: TBlogId): IFBlogSourceStatus {
		const collectedCount = this.articles.filter(
			(article) => article.blogId === blogId,
		).length;
		const patch = this.sourcePatches.get(blogId);
		const phase: TBlogSyncPhase = patch?.phase ?? "complete";
		const isComplete =
			phase === "complete" ||
			phase === "refreshing" ||
			phase === "refresh_failed";

		return {
			blogId,
			status: isComplete ? "complete" : "partial",
			phase,
			collectedCount,
			total: isComplete ? collectedCount : null,
			initialCompletedAt: isComplete ? "2026-09-29T00:00:00.000Z" : null,
			lastSuccessAt: "2026-09-30T00:30:00.000Z",
			lastError: null,
			resumeQueued: false,
			...patch,
		};
	}

	/** 목록 범위(구독 중이고 필터에 맞는) 글을 정렬 순서대로 돌려준다. */
	getScopedArticles({
		blogId,
		sort,
	}: {
		blogId: TBlogId | null;
		sort: "oldest" | "newest";
	}): IFBlogArticleItem[] {
		const scoped = this.articles
			.filter((article) => this.subscribedBlogIds.has(article.blogId))
			.filter((article) => blogId === null || article.blogId === blogId)
			.sort(
				(a, b) =>
					(a.publishedAt ?? "").localeCompare(b.publishedAt ?? "") ||
					a.providerId.localeCompare(b.providerId),
			)
			.map((article) => this.withCompletion(article));

		return sort === "oldest" ? scoped : scoped.reverse();
	}

	/** 본인 유효 메모가 있는 글의 완료·최신 메모 id를 메모 저장소에서 계산한다. */
	private withCompletion(article: TMockBlogArticle): IFBlogArticleItem {
		const validMemos = this.memoStore
			.getAllMemos()
			.filter(
				(memo) =>
					!memo.deleted_at &&
					getPageKey(memo.url) === article.pageKey &&
					[memo.memo, memo.impression, memo.actionItem].some(
						(text) => (text ?? "").trim().length > 0,
					),
			)
			.sort((a, b) => b.id - a.id);

		return {
			...article,
			completed: validMemos.length > 0,
			memoId: validMemos[0]?.id ?? null,
		};
	}
}

const jsonResponse = (route: Route, body: unknown, status = 200) =>
	route.fulfill({
		status,
		contentType: "application/json",
		body: JSON.stringify(body),
	});

/** `get_blog_reading_page`: 커서 다음부터 `p_page_size`개를 돌려준다. */
const handlePageRpc = async (route: Route, store: MockBlogReadingStore) => {
	const args = route.request().postDataJSON() ?? {};
	store.pageRequests.push(args);

	if (store.isPageRequestFailing) {
		await jsonResponse(route, { code: "XX000", message: "boom" }, 500);
		return;
	}

	const scoped = store.getScopedArticles({
		blogId: args.p_blog_id ?? null,
		sort: args.p_sort ?? "oldest",
	});
	const cursor: IFBlogReadingCursor | null = args.p_cursor ?? null;
	const cursorIndex = cursor
		? scoped.findIndex(
				(article) =>
					article.blogId === cursor.blogId &&
					article.providerId === cursor.providerId,
			)
		: -1;
	const start = cursorIndex + 1;
	const size: number = args.p_page_size ?? 30;
	const items = scoped.slice(start, start + size);
	const lastItem = items.at(-1);
	const hasMore = start + size < scoped.length;
	const sourceBlogIds: TBlogId[] = args.p_blog_id
		? [args.p_blog_id]
		: store.getSubscribedBlogIds();

	const page: IFBlogReadingPage = {
		items,
		nextCursor:
			hasMore && lastItem
				? {
						blogId: lastItem.blogId,
						providerId: lastItem.providerId,
						publishedAt: lastItem.publishedAt,
					}
				: null,
		catalogVersion: args.p_catalog_version ?? "mock-catalog-v1",
		newArticleCount: store.newArticleCount,
		sources: sourceBlogIds.map((blogId) => store.getSourceStatus(blogId)),
	};

	await jsonResponse(route, page);
};

/** `get_blog_reading_summary`: 구독별 수집 상태와 메모 완료 고유 글 수. */
const handleSummaryRpc = async (route: Route, store: MockBlogReadingStore) => {
	const summary: IFBlogReadingSummary = {
		sources: store.getSubscribedBlogIds().map((blogId) => ({
			...store.getSourceStatus(blogId),
			subscribedAt: "2026-09-30T00:00:00.000Z",
			completedCount: store
				.getScopedArticles({ blogId, sort: "oldest" })
				.filter((article) => article.completed).length,
		})),
		nextCheckAt: "2026-09-30T01:00:00.000Z",
	};

	await jsonResponse(route, summary);
};

/** `set_blog_subscription`: 구독을 켜거나 끈다. */
const handleSubscriptionRpc = async (
	route: Route,
	store: MockBlogReadingStore,
) => {
	const args = route.request().postDataJSON() ?? {};
	store.setSubscription({ blogId: args.p_blog_id, active: args.p_active });

	await jsonResponse(route, {
		blogId: args.p_blog_id,
		active: args.p_active,
		subscribedAt: args.p_active ? "2026-09-30T00:00:00.000Z" : null,
		unsubscribedAt: args.p_active ? null : "2026-09-30T00:00:00.000Z",
	});
};

/** `request_blog_sync`: 요청을 기록하고 설정된 결과를 돌려준다. */
const handleSyncRpc = async (route: Route, store: MockBlogReadingStore) => {
	const args = route.request().postDataJSON() ?? {};
	store.syncRequestedBlogIds.push(args.p_blog_id);

	if (store.syncRequestStatus === "queued") {
		store.setSourceStatus(args.p_blog_id, { resumeQueued: true });
	}

	await jsonResponse(route, {
		blogId: args.p_blog_id,
		status: store.syncRequestStatus,
		coalesced: false,
		requestedAt: "2026-09-30T00:10:00.000Z",
		nextCheckAt: "2026-09-30T01:00:00.000Z",
		...(store.syncRequestStatus === "throttled"
			? { nextRequestAt: "2026-09-30T00:25:00.000Z" }
			: {}),
	});
};

/**
 * 블로그 정주행 RPC 네 개를 목 저장소로 가로챈다.
 * @description `setupSupabaseMocks`와 같은 컨텍스트에 건다. 이 목이 처리하지 않는 정주행 요청은 목 가드가 막는다.
 */
export async function setupBlogReadingMocks(
	page: Page,
	store: MockBlogReadingStore,
) {
	const context = page.context();
	const rpcHandlers: Record<
		string,
		(route: Route, store: MockBlogReadingStore) => Promise<void>
	> = {
		get_blog_reading_page: handlePageRpc,
		get_blog_reading_summary: handleSummaryRpc,
		set_blog_subscription: handleSubscriptionRpc,
		request_blog_sync: handleSyncRpc,
	};

	for (const [functionName, handler] of Object.entries(rpcHandlers)) {
		await context.route(
			`${SUPABASE.url}/rest/v1/rpc/${functionName}`,
			async (route) => {
				if (route.request().method() !== "POST") {
					await route.fallback();
					return;
				}

				await handler(route, store);
			},
		);
	}
}
