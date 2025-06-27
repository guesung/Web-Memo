const urlNormalizers = {
	"youtube.com": (url: URL) => {
		const videoId = url.searchParams.get("v");
		return `${url.origin}${url.pathname}?v=${videoId}`;
	},
};

export const normalizeUrl = (url: string) => {
	const urlObj = new URL(url);
	const domain = urlObj.hostname.replace("www.", "");

	// 도메인별 특수 처리가 있는 경우 적용
	for (const [key, normalizer] of Object.entries(urlNormalizers)) {
		if (domain.includes(key)) {
			return normalizer(urlObj);
		}
	}

	// 기본 처리
	return `${urlObj.origin}${urlObj.pathname}${urlObj.search}`;
};
