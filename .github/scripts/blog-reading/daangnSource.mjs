/**
 * 당근 기술 블로그 수집. 공개 페이지(medium.com/daangn/all?orderBy=earliest)를 일반 Playwright Chromium으로 열어
 * 화면이 스스로 보내는 PublicationContentDataQuery 응답을 읽고 메타만 추출합니다.
 *
 * 하지 않는 것: 쿠키·로그인, User-Agent 변경, stealth 플러그인, CAPTCHA·Cloudflare 확인 화면 우회, 요청 재생(replay).
 * 접근이 차단되면(403/확인 화면) 우회하지 않고 blocked로 기록합니다.
 * 종료는 마지막 응답의 pageInfo(hasNextPage=false, endCursor 비어 있음)로만 판단하고, 화면의 글 개수가 멈춘 것은 종료로 보지 않습니다.
 */

import { createRequire } from "node:module";
import { join } from "node:path";

import {
	createDaangnAccumulator,
	DAANGN_ALL_URL,
	extractApolloArticles,
	findMissingDomArticleIds,
	looksBlocked,
	pairGraphqlOperations,
} from "./daangnParser.mjs";
import { SourceError } from "./sourceError.mjs";

export { DAANGN_ALL_URL } from "./daangnParser.mjs";

const NAVIGATION_TIMEOUT_MS = 60_000;
const SCROLL_INTERVAL_MS = 800;
const DEFAULT_STALL_LIMIT_MS = 60_000;

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** e2e 워크스페이스에 설치된 Playwright의 chromium을 불러옵니다. 당근을 수집할 때만 필요합니다 */
export const loadChromium = ({ cwd = process.cwd() } = {}) => {
	const requireFromE2e = createRequire(join(cwd, "e2e", "package.json"));

	return requireFromE2e("@playwright/test").chromium;
};

const chunk = (items, size) => {
	const chunks = [];

	for (let index = 0; index < items.length; index += size) {
		chunks.push(items.slice(index, index + size));
	}

	return chunks;
};

/**
 * 페이지를 열고 GraphQL 응답을 누산기에 모으는 공통 준비. 수집과 smoke가 함께 씁니다.
 * 브라우저는 기본 설정 그대로 띄웁니다(헤드리스 여부만 고름).
 */
const openDaangnPage = async ({ chromium, headless = true, log }) => {
	const acc = createDaangnAccumulator();
	const state = { failure: null, chain: Promise.resolve(), graphqlResponses: 0 };
	const browser = await chromium.launch({ headless });

	try {
		const context = await browser.newContext({ locale: "ko-KR" });
		const page = await context.newPage();

		page.on("response", (response) => {
			if (!response.url().includes("/_/graphql")) {
				return;
			}

			// 응답 순서가 cursor 사슬 검증의 전제이므로 한 번에 하나씩 순서대로 처리합니다.
			state.chain = state.chain.then(async () => {
				try {
					if (looksBlocked({ status: response.status() })) {
						throw new SourceError("blocked", `당근 GraphQL 응답이 ${response.status()}입니다`);
					}

					const requestBody = JSON.parse(response.request().postData() ?? "null");
					const responseBody = await response.json();

					for (const paired of pairGraphqlOperations({ requestBody, responseBody })) {
						acc.addResponse(paired);
						state.graphqlResponses += 1;
					}
				} catch (error) {
					state.failure ??= error instanceof SourceError ? error : new SourceError("schema_changed", "당근 GraphQL 응답을 처리하지 못했습니다", { cause: error });
				}
			});
		});

		let navigation;

		try {
			navigation = await page.goto(DAANGN_ALL_URL, { waitUntil: "domcontentloaded", timeout: NAVIGATION_TIMEOUT_MS });
		} catch (error) {
			throw new SourceError("network", "당근 페이지를 열지 못했습니다", { cause: error });
		}

		const status = navigation?.status() ?? 0;
		const title = await page.title();
		const bodySnippet = (await page.content()).slice(0, 4000);

		if (looksBlocked({ status, title, bodySnippet, headers: navigation?.headers() ?? {} })) {
			throw new SourceError("blocked", `당근 페이지 접근이 차단됐습니다 (HTTP ${status}). 우회하지 않고 실패로 기록합니다`);
		}

		log(`당근 페이지 열림: HTTP ${status}`);

		const apolloState = await page.evaluate(() => window.__APOLLO_STATE__ ?? null);
		const initialArticles = extractApolloArticles(apolloState);

		acc.addInitialArticles(initialArticles);

		return { acc, state, page, browser, initialCount: initialArticles.length, status };
	} catch (error) {
		await browser.close();

		throw error;
	}
};

/**
 * 당근 전체 순회. 스크롤로 연속 로딩을 일으키고, 종료 응답(hasNextPage=false)을 받을 때까지 글을 서버에 배치로 저장합니다.
 * 세션 중간 복귀는 하지 않고, 재개하면 처음부터 다시 돌며 글 ID 기준 upsert로 기수집 글을 재사용합니다.
 *
 * @returns 완료 증거 {kind:'daangn', hasNextPage:false, endCursor:'', uniqueCount}
 */
export const collectDaangn = async ({
	ingest,
	chromium,
	now = Date.now,
	deadline = Number.POSITIVE_INFINITY,
	sleep = defaultSleep,
	log = () => {},
	stallLimitMs = DEFAULT_STALL_LIMIT_MS,
	headless = true,
}) => {
	const { acc, state, page, browser } = await openDaangnPage({ chromium, headless, log });

	const flush = async () => {
		const pending = acc.takePending();

		for (const items of chunk(pending, 100)) {
			await ingest.batch(items);
		}

		if (pending.length > 0) {
			await ingest.checkpoint({ uniqueCount: acc.uniqueCount, responses: acc.responseCount, lastEndCursorSeen: acc.lastEndCursor.length > 0 });
			log(`당근 저장: 누적 고유 ${acc.uniqueCount}개 (응답 ${acc.responseCount}회)`);
		}
	};

	try {
		await state.chain;
		await flush();

		let lastResponseCount = -1;
		let lastProgressAt = now();

		while (!acc.isComplete) {
			if (state.failure) {
				throw state.failure;
			}

			if (now() >= deadline) {
				throw new SourceError("time_limit", "시간 제한에 도달했습니다", { checkpoint: { uniqueCount: acc.uniqueCount, responses: acc.responseCount } });
			}

			await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
			await sleep(SCROLL_INTERVAL_MS);
			await state.chain;

			if (state.failure) {
				throw state.failure;
			}

			await flush();

			if (acc.responseCount !== lastResponseCount) {
				lastResponseCount = acc.responseCount;
				lastProgressAt = now();
			} else if (now() - lastProgressAt > stallLimitMs) {
				throw new SourceError("network", "스크롤해도 새 응답이 없지만 종료 응답(hasNextPage=false)도 받지 못했습니다");
			}
		}

		await state.chain;
		await flush();

		const hrefs = await page.$$eval("a[href]", (anchors) => anchors.map((anchor) => anchor.href));
		const missingIds = findMissingDomArticleIds({ hrefs, hasArticle: acc.hasArticle });

		if (missingIds.length > 0) {
			throw new SourceError("schema_changed", `화면에는 있으나 응답 파싱에서 빠진 글이 ${missingIds.length}개 있습니다(예: ${missingIds.slice(0, 3).join(", ")})`);
		}

		return acc.buildEvidence();
	} finally {
		await browser.close();
	}
};

/**
 * CI smoke: 일반 Chromium에서 당근 목록이 열리고 응답 모양을 읽을 수 있는지만 확인합니다. 저장하지 않습니다.
 * 차단이면 blocked, 목록 글을 하나도 못 읽으면 schema_changed로 던집니다.
 */
export const smokeDaangn = async ({ chromium, sleep = defaultSleep, log = () => {}, maxScrolls = 6, headless = true }) => {
	const { acc, state, page, browser, initialCount, status } = await openDaangnPage({ chromium, headless, log });

	try {
		for (let scroll = 0; scroll < maxScrolls && state.graphqlResponses === 0 && !state.failure; scroll += 1) {
			await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
			await sleep(SCROLL_INTERVAL_MS * 2);
			await state.chain;
		}

		await state.chain;

		if (state.failure) {
			throw state.failure;
		}

		if (acc.uniqueCount === 0) {
			throw new SourceError("schema_changed", "당근 목록 글을 하나도 읽지 못했습니다(초기 렌더·GraphQL 모두)");
		}

		return { ok: true, httpStatus: status, initialArticles: initialCount, graphqlResponses: state.graphqlResponses, uniqueArticles: acc.uniqueCount };
	} finally {
		await browser.close();
	}
};
