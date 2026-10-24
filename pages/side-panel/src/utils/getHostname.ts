/** URL의 호스트명을 돌려준다. URL이 아니면 입력을 그대로 돌려준다. */
export const getHostname = (url: string) => {
	try {
		return new URL(url).hostname;
	} catch {
		return url;
	}
};
