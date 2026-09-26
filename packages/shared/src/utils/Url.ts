const URL_NORMALIZERS: Record<string, (url: URL) => string> = {
	"youtube.com": (url: URL) => {
		const videoId = url.searchParams.get("v");
		return `${url.origin}${url.pathname}?v=${videoId}`;
	},
};

/** URL의 기존 저장 형식을 유지하면서 fragment를 제거한다. */
export const normalizeUrl = (url: string): string => {
	try {
		const urlObj = new URL(url);
		const domain = urlObj.hostname.replace(/^www\./, "");

		for (const [key, normalizer] of Object.entries(URL_NORMALIZERS)) {
			if (domain === key || domain.endsWith(`.${key}`)) {
				return normalizer(urlObj);
			}
		}

		return `${urlObj.origin}${urlObj.pathname}${urlObj.search}`;
	} catch {
		throw new Error(`Invalid URL: ${url}`);
	}
};

/** 메모와 하이라이트 조회에 사용할 페이지 식별값을 만든다. */
export const getPageKey = (url: string): string => {
	const normalizedUrl = normalizeUrl(url);
	const queryStartIndex = normalizedUrl.indexOf("?");

	if (queryStartIndex === -1) {
		return normalizedUrl;
	}

	const urlWithoutQuery = normalizedUrl.slice(0, queryStartIndex);
	const query = normalizedUrl.slice(queryStartIndex + 1);
	const meaningfulParameters = query.split("&").filter((parameter) => {
		const parameterName = parameter.split("=", 1)[0];
		const isTrackingParameter =
			/^utm_/i.test(parameterName) ||
			/^(gclid|fbclid|msclkid)$/i.test(parameterName);

		return !isTrackingParameter;
	});

	if (meaningfulParameters.length === 0) {
		return urlWithoutQuery;
	}

	return `${urlWithoutQuery}?${meaningfulParameters.join("&")}`;
};

/**
 * 쿼리만 다른 메모를 같은 후보 묶음으로 찾기 위한 경로 키를 만든다.
 * @description 페이지 키에서 쿼리를 뺀다. 쿼리가 곧 페이지를 가르는 도메인(URL_NORMALIZERS, 예: YouTube의 `?v=`)은
 * 페이지 키를 그대로 쓴다. 저장 키가 아니라 후보 조회 전용이다.
 */
export const getPathKey = (url: string): string => {
	const pageKey = getPageKey(url);
	const domain = new URL(pageKey).hostname.replace(/^www\./, "");
	const hasCustomNormalizer = Object.keys(URL_NORMALIZERS).some(
		(key) => domain === key || domain.endsWith(`.${key}`),
	);

	if (hasCustomNormalizer) {
		return pageKey;
	}

	const queryStartIndex = pageKey.indexOf("?");

	if (queryStartIndex === -1) {
		return pageKey;
	}

	return pageKey.slice(0, queryStartIndex);
};

/**
 * 같은 글인지 비교하기 위한 느슨한 URL 키를 만든다.
 * @description 저장 키인 normalizeUrl과 달리 추적 파라미터·m./www. 서브도메인·youtu.be 단축 주소·끝 슬래시·hash 차이를 무시한다.
 * 비교 전용이므로 저장·조회 키로 쓰지 않는다. 파싱할 수 없는 URL이면 null을 돌려준다.
 */
export const toLooseUrlKey = (url: string): string | null => {
	try {
		const urlObj = new URL(url);
		const hostname = urlObj.hostname.replace(/^(www|m)\./, "");

		if (hostname === "youtu.be") {
			const videoId = urlObj.pathname.slice(1);

			return `youtube.com/watch?v=${videoId}`;
		}

		if (hostname === "youtube.com" && urlObj.pathname === "/watch") {
			return `youtube.com/watch?v=${urlObj.searchParams.get("v")}`;
		}

		const searchParams = new URLSearchParams();
		const sortedEntries = Array.from(urlObj.searchParams.entries()).sort(
			([keyA], [keyB]) => keyA.localeCompare(keyB),
		);

		for (const [key, value] of sortedEntries) {
			const isTrackingParam =
				key.startsWith("utm_") ||
				["fbclid", "gclid", "ref", "si"].includes(key);

			if (!isTrackingParam) {
				searchParams.append(key, value);
			}
		}

		const pathname = urlObj.pathname.replace(/\/+$/, "");
		const search = searchParams.toString();

		return `${hostname}${pathname}${search ? `?${search}` : ""}`;
	} catch {
		return null;
	}
};
