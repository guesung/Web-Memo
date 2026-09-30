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

/**
 * URL에서 도메인 필터에 쓰는 도메인을 구한다.
 * @description 소문자 hostname에서 앞의 `www.`만 지운다. `m.`·서브도메인은 다른 도메인으로 본다.
 * http(s) 주소가 아니거나 파싱할 수 없으면 null을 돌려준다.
 */
export const getDomainFromUrl = (url: string): string | null => {
	try {
		const urlObj = new URL(url);

		if (urlObj.protocol !== "http:" && urlObj.protocol !== "https:") {
			return null;
		}

		const domain = urlObj.hostname.toLowerCase().replace(/^www\./, "");

		if (!domain) {
			return null;
		}

		return domain;
	} catch {
		return null;
	}
};

/**
 * 검색 주소의 도메인 값을 도메인 필터에 쓸 수 있는 형태로 바꾼다.
 * @description 소문자로 바꾸고 앞의 `www.`를 지운다. 영문·숫자·`.`·`-` 외의 문자가 있으면
 * 정규식 조건에 들어가지 않도록 없는 값(undefined)으로 본다.
 */
export const parseDomainFilter = (
	value: string | null | undefined,
): string | undefined => {
	if (!value) {
		return undefined;
	}

	const domain = value
		.trim()
		.toLowerCase()
		.replace(/^www\./, "");

	if (!/^[a-z0-9.-]+$/.test(domain)) {
		return undefined;
	}

	return domain;
};

/**
 * 도메인의 메모 url을 고르는 정규식(PostgREST `imatch`)을 만든다.
 * @description `www.`는 같은 도메인으로 잡고 `m.`·서브도메인은 잡지 않는다. 도메인 뒤에는
 * 경로·포트·쿼리·해시가 오거나 문자열이 끝나야 한다. 인자는 {@link parseDomainFilter}를 거친 값이어야 한다.
 */
export const getDomainUrlPattern = (domain: string): string =>
	`^https?://(www\\.)?${domain.replace(/\./g, "\\.")}([/:?#]|$)`;
