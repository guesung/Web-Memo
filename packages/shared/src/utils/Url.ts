const urlNormalizers = {
	"youtube.com": (url: URL) => {
		const videoId = url.searchParams.get("v");
		return `${url.origin}${url.pathname}?v=${videoId}`;
	},
};

export const normalizeUrl = (url: string) => {
	const urlObj = new URL(url);
	const domain = urlObj.hostname.replace("www.", "");

	for (const [key, normalizer] of Object.entries(urlNormalizers)) {
		if (domain.includes(key)) {
			return normalizer(urlObj);
		}
	}

	return `${urlObj.origin}${urlObj.pathname}${urlObj.search}`;
};
