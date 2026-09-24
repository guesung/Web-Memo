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
