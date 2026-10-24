import type { IFBlogArticleItem } from "../../types/blogReading";
import { getPageKey } from "../Url";

/**
 * 블로그 글 URL의 page_key를 만든다. SQL `memo.blog_page_key`와 같은 계약이다.
 * @description 기존 {@link getPageKey}(hash·추적 파라미터 제거, 의미 있는 query 보존)를 그대로 쓰고,
 * SQL처럼 http(s)가 아니거나 해석할 수 없는 URL은 예외 대신 null을 돌려준다.
 * @example getBlogArticlePageKey("https://toss.tech/article/x?utm_source=a#top") // "https://toss.tech/article/x"
 */
export const getBlogArticlePageKey = (
	url: string | null | undefined,
): string | null => {
	if (!url || !/^https?:\/\//i.test(url)) {
		return null;
	}

	try {
		return getPageKey(url);
	} catch {
		return null;
	}
};

/**
 * Medium 글 URL에서 글 ID를 뽑는다. SQL `memo.blog_medium_post_id`와 같은 계약이다.
 * @description `medium.com`·`*.medium.com`에서 경로 끝의 `-<10~12자리 hex>` 또는 `/p/<hex>`를 글 ID로 본다.
 * slug나 `?source=rss` 차이가 있어도 같은 글을 잇는 데 쓴다. 추출이 느슨해도 비교는 수집된 provider ID와의 완전 일치로만 한다.
 * @example getMediumPostId("https://medium.com/daangn/slug-3fa344b4391b?source=rss") // "3fa344b4391b"
 */
export const getMediumPostId = (
	url: string | null | undefined,
): string | null => {
	if (!url) {
		return null;
	}

	const urlWithoutQuery = url.split("#")[0].split("?")[0];
	const urlMatch = /^https?:\/\/([^/]+)(\/.*)?$/i.exec(urlWithoutQuery);

	if (!urlMatch) {
		return null;
	}

	const host = urlMatch[1]
		.replace(/^.*@/, "")
		.replace(/:[0-9]*$/, "")
		.toLowerCase();

	if (host !== "medium.com" && !host.endsWith(".medium.com")) {
		return null;
	}

	const path = urlMatch[2] ?? "";
	const shortLinkMatch = /^\/p\/([0-9a-f]{10,12})\/?$/.exec(path);

	if (shortLinkMatch) {
		return shortLinkMatch[1];
	}

	const slugMatch = /\/(?:[^/]*-)?([0-9a-f]{10,12})\/?$/.exec(path);

	return slugMatch?.[1] ?? null;
};

/**
 * 주어진 URL이 체크리스트의 글과 같은 글인지 본다.
 * @description page_key가 같거나, 당근 글이면 Medium 글 ID가 provider ID와 같을 때 true.
 * 서버가 가진 별칭(과거 slug)은 알 수 없으므로 완료 판정에는 쓰지 않는다. 완료는 항상 서버 응답의 `completed`를 따른다.
 * 앱 브라우저에서 지금 보는 페이지가 정주행 글인지 가늠하는 용도다.
 */
export const isSameBlogArticle = ({
	article,
	url,
}: {
	article: Pick<IFBlogArticleItem, "blogId" | "providerId" | "pageKey">;
	url: string;
}): boolean => {
	if (getBlogArticlePageKey(url) === article.pageKey) {
		return true;
	}

	return (
		article.blogId === "daangn" && getMediumPostId(url) === article.providerId
	);
};
