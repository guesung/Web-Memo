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
