/** 원래 anchor를 보존하며 브라우저의 문장 위치 이동을 요청한다. */
export function getHighlightSourceUrl(source: {
	url: string;
	exact_text: string;
	prefix_text?: string | null;
	suffix_text?: string | null;
}): string {
	try {
		const url = new URL(source.url);
		if (!["http:", "https:"].includes(url.protocol)) return "#";
		const text = source.exact_text.trim();
		if (!text) return url.href;
		const encode = (value: string) =>
			encodeURIComponent(value).replace(/-/g, "%2D");
		const parts = text
			.split(/\r?\n/)
			.map((part) => part.trim())
			.filter(Boolean);
		// 여러 블록 인용은 textStart/textEnd로 양 끝을 지정한다.
		const target =
			parts.length > 1
				? `${encode(parts[0])},${encode(parts[parts.length - 1])}`
				: encode(text);
		const prefix = source.prefix_text?.trim();
		const suffix = source.suffix_text?.trim();
		const directive = `${prefix ? `${encode(prefix)}-,` : ""}${target}${suffix ? `,-${encode(suffix)}` : ""}`;
		const anchor = url.hash.split(":~:")[0];
		url.hash = `${anchor || "#"}:~:text=${directive}`;
		return url.href;
	} catch {
		return "#";
	}
}
