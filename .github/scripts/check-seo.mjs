import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";
import {
	createReport,
	evaluatePage,
	isGooglebotBlocked,
	parseSeoHtml,
} from "./lib/seo-report.mjs";
import { inspectSeoImage } from "./lib/seo-assets.mjs";
import { writeSeoReport } from "./lib/seo-output.mjs";
import {
	addDeviceDifferenceWarnings,
	addDuplicateWarnings,
	addHreflangIssues,
} from "./lib/seo-relations.mjs";

/** 검사 결과의 순수 파싱·판정 함수를 테스트와 다른 로컬 도구에 제공합니다. */
export { addDuplicateWarnings, createReport, evaluatePage, parseSeoHtml };

/** Web Memo에서 검색 노출을 점검하는 공개 페이지입니다. */
export const SEO_URLS = ["ko", "en"].flatMap((language) =>
	["introduce", "memo", "youtube-summary", "save-articles", "privacy"].map(
		(route) =>
			`https://www.webmemo.xyz/${language}/${["introduce", "privacy"].includes(route) ? "" : "features/"}${route}`,
	),
);
/** Google이 공개한 스마트폰·데스크톱 크롤러 식별 문자열입니다. */
export const GOOGLEBOT_AGENTS = {
	mobile:
		"Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
	pc: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/131.0.0.0 Safari/537.36",
};

/** 각 요청에 제한 시간을 적용하고 최대 5번의 리다이렉트 이력을 보존합니다. */
export const inspectPage = async ({
	url,
	agent,
	fetcher = fetch,
	timeoutMs = 15000,
	kind = "page",
	expectedDestination,
}) => {
	const page = {
		url,
		agent,
		kind,
		expectedDestination,
		finalUrl: url,
		status: null,
		contentType: "",
		robotsHeader: "",
		redirects: [],
		metadata: null,
		failure: null,
		issues: [],
	};
	const signal = AbortSignal.timeout(timeoutMs);
	try {
		for (let hop = 0; hop <= 5; hop += 1) {
			const response = await fetcher(page.finalUrl, {
				headers: { "User-Agent": GOOGLEBOT_AGENTS[agent] },
				redirect: "manual",
				signal,
			});
			page.status = response.status;
			page.contentType = response.headers.get("content-type") ?? "";
			page.robotsHeader = response.headers.get("x-robots-tag") ?? "";
			if ([301, 302, 303, 307, 308].includes(response.status)) {
				const location = response.headers.get("location");
				await response.body?.cancel();
				if (!location) {
					throw new Error("리다이렉트 Location 헤더가 없음");
				}
				const destination = new URL(location, page.finalUrl);
				page.redirects.push({
					url: page.finalUrl,
					status: response.status,
					destination: destination.href,
				});
				if (hop === 5 || !["http:", "https:"].includes(destination.protocol)) {
					throw new Error("리다이렉트 한도 초과 또는 지원하지 않는 프로토콜");
				}
				page.finalUrl = destination.href;
				continue;
			}
			const html = await response.text();
			if (kind === "sitemap") {
				page.sitemapUrls = parseSitemap(html);
			} else if (kind === "robots") {
				if (
					!/^\s*user-agent\s*:\s*\S+/im.test(html) ||
					/<html[\s>]/i.test(html)
				) {
					throw new Error("robots.txt에 유효한 User-agent 규칙이 없음");
				}
				page.robotsText = html;
			} else if (
				/^(text\/html|application\/xhtml\+xml)(?:\s*;|$)/i.test(
					page.contentType,
				)
			) {
				page.metadata = parseSeoHtml(html);
			}
			break;
		}
	} catch (error) {
		page.failure = error instanceof Error ? error.message : String(error);
	}
	page.issues = evaluatePage(page);

	return page;
};

/** URL 집합 sitemap만 허용하며 다른 도메인으로 검사 요청이 확장되지 않게 검증합니다. */
export const parseSitemap = (xml) => {
	const dom = new JSDOM(xml, { contentType: "text/xml" });
	try {
		const root = dom.window.document.documentElement;
		if (
			root.localName !== "urlset" ||
			root.namespaceURI !== "http://www.sitemaps.org/schemas/sitemap/0.9"
		) {
			throw new Error("지원하지 않는 sitemap 형식: urlset이 필요함");
		}
		const urls = Array.from(
			root.getElementsByTagNameNS(root.namespaceURI, "loc"),
		).map((element) => new URL(element.textContent.trim()));
		if (
			urls.length === 0 ||
			urls.some((url) => url.origin !== "https://www.webmemo.xyz")
		) {
			throw new Error(
				"sitemap URL이 비어 있거나 Web Memo 운영 도메인 밖을 가리킴",
			);
		}

		return [...new Set(urls.map((url) => url.href))];
	} finally {
		dom.window.close();
	}
};

/** 전체 공개 URL을 두 크롤러로 검사하고 실패 응답도 포함해 리포트를 저장합니다. */
export const runSeoCheck = async ({ fetcher = fetch } = {}) => {
	const pages = [];
	for (const agent of Object.keys(GOOGLEBOT_AGENTS)) {
		pages.push(
			await inspectPage({
				url: "https://www.webmemo.xyz/sitemap.xml",
				agent,
				kind: "sitemap",
				fetcher,
			}),
		);
		pages.push(
			await inspectPage({
				url: "https://www.webmemo.xyz/robots.txt",
				agent,
				kind: "robots",
				fetcher,
			}),
		);
	}
	const sitemapPages = pages.filter((page) => page.kind === "sitemap");
	const urls = [
		...new Set(
			sitemapPages.flatMap((page) =>
				page.issues.some((issue) => issue.severity === "error")
					? SEO_URLS
					: page.sitemapUrls,
			),
		),
	];
	const requests = urls.flatMap((url) =>
		Object.keys(GOOGLEBOT_AGENTS).map((agent) => ({ url, agent })),
	);
	for (const page of pages.filter(
		(item) => item.kind === "robots" && item.robotsText,
	)) {
		page.blockedUrls = urls.filter((url) => {
			const target = new URL(url);

			return isGooglebotBlocked(
				page.robotsText,
				`${target.pathname}${target.search}`,
			);
		});
		for (const url of page.blockedUrls) {
			page.issues.push({
				severity: "error",
				code: "ROBOTS_BLOCKED",
				field: `robots.txt:${url}`,
				message: `robots.txt가 Googlebot 크롤링을 차단함: ${url}`,
			});
		}
	}
	for (let offset = 0; offset < requests.length; offset += 4) {
		pages.push(
			...(await Promise.all(
				requests
					.slice(offset, offset + 4)
					.map((request) => inspectPage({ ...request, fetcher })),
			)),
		);
	}
	addDuplicateWarnings(pages);
	addDeviceDifferenceWarnings(pages);
	addHreflangIssues(pages);
	for (const language of ["ko", "en"]) {
		for (const agent of Object.keys(GOOGLEBOT_AGENTS)) {
			pages.push(
				await inspectPage({
					url: `https://www.webmemo.xyz/${language}`,
					agent,
					expectedDestination: `https://www.webmemo.xyz/${language}/introduce`,
					fetcher,
				}),
			);
		}
	}
	for (const canonicalUrl of urls.filter((url) =>
		/^https:\/\/www\.webmemo\.xyz\/(ko|en)\/introduce$/.test(url),
	)) {
		for (const url of createNormalizationVariants(canonicalUrl)) {
			pages.push(
				await inspectPage({
					url,
					agent: "pc",
					kind: "normalization",
					expectedDestination: canonicalUrl,
					fetcher,
				}),
			);
		}
	}
	const imageUrls = [
		...new Set(
			pages
				.filter((page) => page.kind === "page")
				.map((page) => page.metadata?.og.image)
				.filter(Boolean),
		),
	];
	for (let offset = 0; offset < imageUrls.length; offset += 4) {
		pages.push(
			...(await Promise.all(
				imageUrls
					.slice(offset, offset + 4)
					.map((url) => inspectSeoImage({ url, fetcher })),
			)),
		);
	}
	const { report, markdown } = createReport(pages);
	await writeSeoReport({ report, markdown });
	console.log(
		`SEO 검사 완료: 오류 ${report.errors}건, 경고 ${report.warnings}건`,
	);
	if (report.errors > 0) {
		process.exitCode = 1;
	}
};

/** 정규 URL이 아닌 HTTP·apex·후행 슬래시 변형을 만듭니다. */
export const createNormalizationVariants = (canonicalUrl) => {
	const canonical = new URL(canonicalUrl);

	return [
		`http://${canonical.host}${canonical.pathname}`,
		`https://webmemo.xyz${canonical.pathname}`,
		`${canonical.href}/`,
	];
};

if (
	process.argv[1] &&
	pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
	await runSeoCheck();
}
