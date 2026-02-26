export function formatUrl(input: string): string | null {
	const url = input.trim();
	if (!url) return null;
	if (!url.startsWith("http://") && !url.startsWith("https://")) {
		if (url.includes(".") && !url.includes(" ")) {
			return `https://${url}`;
		}
		return `https://www.google.com/search?q=${encodeURIComponent(url)}`;
	}
	return url;
}
