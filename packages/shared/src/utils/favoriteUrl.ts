const HTTP_PROTOCOLS = ["http:", "https:"];

/**
 * 사용자가 입력한 즐겨찾기 URL을 저장 가능한 형태로 만든다. 읽을 수 없으면 null.
 *
 * @description 앞뒤 공백을 자르고 scheme이 없으면 `https://`를 붙인다. http·https가 아니면 null이다.
 */
export const normalizeFavoriteUrl = (input: string): string | null => {
	const trimmed = input.trim();
	if (!trimmed) return null;

	const hasScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed);
	const candidate = hasScheme ? trimmed : `https://${trimmed}`;

	try {
		const url = new URL(candidate);
		const hasHostname = url.hostname.length > 0;

		return HTTP_PROTOCOLS.includes(url.protocol) && hasHostname
			? url.href
			: null;
	} catch {
		return null;
	}
};

/** 제목이 비어 있으면 URL의 도메인(`www.` 제외)을 제목으로 쓴다. */
export const resolveFavoriteTitle = (url: string, title: string): string => {
	const trimmedTitle = title.trim();
	if (trimmedTitle) return trimmedTitle;

	try {
		return new URL(url).hostname.replace(/^www\./, "");
	} catch {
		return url;
	}
};
