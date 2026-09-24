const urlNormalizers: Record<string, (url: URL) => string> = {
	"youtube.com": (url: URL) => {
		const videoId = url.searchParams.get("v");
		return `${url.origin}${url.pathname}?v=${videoId}`;
	},
};

export const normalizeUrl = (url: string): string => {
	try {
		const urlObj = new URL(url);
		const domain = urlObj.hostname.replace(/^www\./, "");

		for (const [key, normalizer] of Object.entries(urlNormalizers)) {
			if (domain === key || domain.endsWith(`.${key}`)) {
				return normalizer(urlObj);
			}
		}

		return `${urlObj.origin}${urlObj.pathname}${urlObj.search}`;
	} catch {
		throw new Error(`Invalid URL: ${url}`);
	}
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
		const sortedEntries = [...urlObj.searchParams.entries()].sort(
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
