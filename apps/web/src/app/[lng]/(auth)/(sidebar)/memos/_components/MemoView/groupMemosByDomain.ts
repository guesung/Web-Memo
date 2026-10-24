export const UNKNOWN_DOMAIN = "";

export const getMemoDomain = (url: string): string => {
	try {
		const parsed = new URL(url);
		if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
			return UNKNOWN_DOMAIN;
		}

		return (
			parsed.hostname.toLowerCase().replace(/^www\./, "") || UNKNOWN_DOMAIN
		);
	} catch {
		return UNKNOWN_DOMAIN;
	}
};

/** 로드된 모든 페이지를 조회 순서대로 훑어 첫 등장 순서의 도메인 그룹을 만든다. */
export const groupMemosByDomain = <TMemo extends { url: string }>(
	memos: TMemo[],
) => {
	const groups = new Map<string, TMemo[]>();
	for (const memo of memos) {
		const domainKey = getMemoDomain(memo.url);
		const group = groups.get(domainKey) ?? [];
		group.push(memo);
		groups.set(domainKey, group);
	}

	return Array.from(groups, ([key, groupedMemos]) => ({
		key,
		memos: groupedMemos,
	}));
};
