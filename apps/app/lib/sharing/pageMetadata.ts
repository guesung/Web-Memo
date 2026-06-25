/**
 * URL의 origin을 기반으로 Google Favicon API favicon URL을 생성한다.
 * @param pageUrl 대상 페이지 URL
 * @returns favicon URL, URL 파싱 실패 시 null
 */
export function getFavIconUrl(pageUrl: string): string | null {
	try {
		const origin = new URL(pageUrl).origin;
		return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(origin)}&sz=64`;
	} catch {
		return null;
	}
}

/**
 * URL의 HTML을 가져와 <title> 태그에서 페이지 제목을 추출한다.
 * @param url 대상 페이지 URL
 * @returns 페이지 제목, 가져오기/파싱 실패 시 null
 * @description 성능을 위해 응답 본문의 앞 50,000자만 파싱한다.
 */
export async function fetchPageTitle(url: string): Promise<string | null> {
	try {
		const response = await fetch(url, {
			headers: { "User-Agent": "Mozilla/5.0" },
		});
		const html = await response.text().then((t) => t.slice(0, 50000));
		const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
		return match?.[1]?.trim() || null;
	} catch {
		return null;
	}
}

/**
 * URL에서 사람이 읽기 좋은 기본 제목(hostname)을 만든다.
 * @param url 대상 페이지 URL
 * @returns www를 제거한 hostname, 파싱 실패 시 원본 URL
 */
export function getFallbackTitle(url: string): string {
	try {
		return new URL(url).hostname.replace("www.", "");
	} catch {
		return url;
	}
}

/**
 * 사용자가 입력한 문자열을 메모 생성에 사용할 수 있는 URL로 정규화한다.
 * @param input 사용자 입력 문자열
 * @returns 정규화된 URL, URL로 볼 수 없으면 null
 * @description http(s) 스킴이 없으면 https://를 붙이며, 점(.)이 없는 등 URL로 보기 어려우면 null을 반환한다.
 */
export function normalizeInputUrl(input: string): string | null {
	const trimmed = input.trim();

	if (!trimmed || trimmed.includes(" ")) {
		return null;
	}

	if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
		return trimmed;
	}

	if (trimmed.includes(".")) {
		return `https://${trimmed}`;
	}

	return null;
}

/**
 * URL로부터 메모 생성에 필요한 메타데이터(제목, favIcon)를 추출한다.
 * @param url 대상 페이지 URL
 * @returns 추출된 제목과 favIconUrl
 * @description metaTitle이 없으면 <title> 추출을 시도하고, 그래도 없으면 hostname을 사용한다.
 */
export async function extractPageMetadata(
	url: string,
	metaTitle?: string,
): Promise<{ title: string; favIconUrl: string | null }> {
	let title = metaTitle || "";

	if (!title) {
		title = (await fetchPageTitle(url)) || "";
	}
	if (!title) {
		title = getFallbackTitle(url);
	}

	return { title, favIconUrl: getFavIconUrl(url) };
}
