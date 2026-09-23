/** 동일 크롤러의 서로 다른 URL 사이에서 중복 메타데이터를 경고합니다. */
export const addDuplicateWarnings = (pages) => {
	for (const agent of new Set(pages.map((page) => page.agent))) {
		for (const field of ["title", "description"]) {
			const groups = new Map();
			for (const page of pages.filter((item) => item.agent === agent)) {
				const value = page.metadata?.[field].replace(/\s+/g, " ").trim();
				if (value) {
					groups.set(value, [...(groups.get(value) ?? []), page]);
				}
			}
			for (const group of groups.values()) {
				if (new Set(group.map((page) => page.url)).size > 1) {
					for (const page of group) {
						const relatedUrls = [
							...new Set(
								group
									.map((item) => item.url)
									.filter((url) => url !== page.url),
							),
						];
						page.issues.push({
							severity: "warning",
							code: "META_DUPLICATE_ACROSS_PAGES",
							field,
							relatedUrls,
							message: `${field} 중복: ${group.map((item) => item.url).join(", ")}`,
						});
					}
				}
			}
		}
	}
};

/** PC·모바일이 모두 정상인 URL의 검색 메타데이터 차이를 경고합니다. */
export const addDeviceDifferenceWarnings = (pages) => {
	const comparablePages = pages.filter(
		(page) =>
			page.kind === "page" &&
			!page.failure &&
			page.status >= 200 &&
			page.status < 300 &&
			page.metadata,
	);
	for (const url of new Set(comparablePages.map((page) => page.url))) {
		const mobile = comparablePages.find(
			(page) => page.url === url && page.agent === "mobile",
		);
		const pc = comparablePages.find(
			(page) => page.url === url && page.agent === "pc",
		);
		if (!mobile || !pc) {
			continue;
		}
		for (const field of [
			"title",
			"description",
			"canonical",
			"robots",
			"lang",
			"og",
			"twitter",
			"hreflang",
		]) {
			if (
				stableSerialize(getMetadataField(mobile.metadata, field)) ===
				stableSerialize(getMetadataField(pc.metadata, field))
			) {
				continue;
			}
			for (const page of [mobile, pc]) {
				page.issues.push({
					severity: "warning",
					code: "DEVICE_METADATA_MISMATCH",
					field,
					message: `PC·모바일 ${field} 불일치`,
				});
			}
		}
	}
};

/** hreflang의 절대 URL·자기 참조·중복·상호 복귀 링크를 검사합니다. */
export const addHreflangIssues = (pages) => {
	const comparablePages = pages.filter(
		(page) => page.kind === "page" && page.metadata && !page.failure,
	);
	for (const page of comparablePages) {
		const links = page.metadata.hreflang;
		if (links.length === 0) {
			page.issues.push({
				severity: "warning",
				code: "HREFLANG_MISSING",
				field: "hreflang",
				message: "HTML hreflang 누락",
			});
			continue;
		}
		const byLanguage = new Map();
		for (const link of links) {
			const parsedUrl = parseAbsoluteHttpUrl(link.url);
			if (!parsedUrl) {
				page.issues.push({
					severity: "error",
					code: "HREFLANG_URL_INVALID",
					field: `hreflang.${link.language || "unknown"}`,
					message: `hreflang이 절대 HTTP(S) URL이 아님: ${link.url || "없음"}`,
				});
				continue;
			}
			const previous = byLanguage.get(link.language);
			if (previous) {
				page.issues.push({
					severity: previous === parsedUrl.href ? "warning" : "error",
					code:
						previous === parsedUrl.href
							? "HREFLANG_DUPLICATE"
							: "HREFLANG_CONFLICT",
					field: `hreflang.${link.language}`,
					message: `hreflang ${link.language} 중복${previous === parsedUrl.href ? "" : "·충돌"}`,
				});
			}
			byLanguage.set(link.language, parsedUrl.href);
		}
		const pageLanguage = new URL(page.url).pathname.split("/")[1].toLowerCase();
		if (byLanguage.get(pageLanguage) !== page.url) {
			page.issues.push({
				severity: "error",
				code: "HREFLANG_SELF_REFERENCE_MISSING",
				field: `hreflang.${pageLanguage || "unknown"}`,
				message: `hreflang 자기 참조 누락: ${page.url}`,
			});
		}
		for (const [language, targetUrl] of byLanguage) {
			if (language === "x-default" || targetUrl === page.url) {
				continue;
			}
			const target = comparablePages.find(
				(item) => item.agent === page.agent && item.url === targetUrl,
			);
			if (!target) {
				continue;
			}
			const hasReturnLink = target.metadata.hreflang.some(
				(link) => parseAbsoluteHttpUrl(link.url)?.href === page.url,
			);
			if (!hasReturnLink) {
				page.issues.push({
					severity: "error",
					code: "HREFLANG_RETURN_LINK_MISSING",
					field: `hreflang.${language}`,
					relatedUrl: targetUrl,
					message: `hreflang 상호 복귀 링크 누락: ${targetUrl}`,
				});
			}
		}
	}
};

/** 객체와 배열의 키 순서를 고정해 비교합니다. */
const stableSerialize = (value) => {
	if (Array.isArray(value)) {
		return JSON.stringify(
			value.map((item) =>
				typeof item === "object" && item
					? Object.fromEntries(Object.entries(item).sort())
					: item,
			),
		);
	}
	if (typeof value === "object" && value) {
		return JSON.stringify(Object.fromEntries(Object.entries(value).sort()));
	}

	return JSON.stringify(value);
};

/** hreflang은 선언 순서가 아닌 언어·URL 집합으로 비교합니다. */
const getMetadataField = (metadata, field) => {
	if (field !== "hreflang") {
		return metadata[field];
	}

	return [...metadata.hreflang].sort((first, second) =>
		`${first.language}:${first.url}`.localeCompare(
			`${second.language}:${second.url}`,
		),
	);
};

/** 절대 HTTP(S) URL만 반환합니다. */
const parseAbsoluteHttpUrl = (value) => {
	try {
		const url = new URL(value);

		return ["http:", "https:"].includes(url.protocol) ? url : null;
	} catch {
		return null;
	}
};
