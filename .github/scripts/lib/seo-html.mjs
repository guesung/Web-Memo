import { JSDOM } from "jsdom";

/** JSON-LD에서 검색 기능에 직접 의미가 있는 선언 타입입니다. */
const SUPPORTED_STRUCTURED_DATA_TYPES = new Set([
	"Organization",
	"SoftwareApplication",
	"WebPage",
	"FAQPage",
]);

/** 스크립트를 실행하지 않고 서버 HTML의 검색 메타데이터를 추출합니다. */
export const parseSeoHtml = (html) => {
	const dom = new JSDOM(html);
	const document = dom.window.document;
	const content = (selector) =>
		document.querySelector(selector)?.getAttribute("content")?.trim() ?? "";
	const metadata = {
		title: document.title.trim(),
		description: content('meta[name="description" i]'),
		canonical:
			document
				.querySelector('link[rel="canonical" i]')
				?.getAttribute("href")
				?.trim() ?? "",
		robots: Array.from(
			document.querySelectorAll(
				'meta[name="robots" i], meta[name="googlebot" i]',
			),
		)
			.map((element) => element.getAttribute("content") ?? "")
			.join(", "),
		lang: document.documentElement.lang,
		h1: Array.from(document.querySelectorAll("h1")).map((element) =>
			element.textContent.trim(),
		),
		og: Object.fromEntries(
			["title", "description", "url", "image", "type"].map((name) => [
				name,
				content(`meta[property="og:${name}" i]`),
			]),
		),
		twitter: Object.fromEntries(
			["card", "title", "description", "image"].map((name) => [
				name,
				content(`meta[name="twitter:${name}" i]`),
			]),
		),
		hreflang: Array.from(
			document.querySelectorAll('link[rel~="alternate" i][hreflang]'),
		).map((element) => ({
			language: element.getAttribute("hreflang")?.trim().toLowerCase() ?? "",
			url: element.getAttribute("href")?.trim() ?? "",
		})),
		structuredData: parseStructuredData(document),
	};
	document
		.querySelectorAll("script, style, template, noscript")
		.forEach((element) => element.remove());
	metadata.bodyText = document.body.textContent.replace(/\s+/g, " ").trim();
	dom.window.close();

	return metadata;
};

/** JSON-LD 스크립트의 배열과 @graph를 평탄화하되 참조 전용 노드는 허용합니다. */
const parseStructuredData = (document) => {
	const nodes = [];
	const errors = [];
	for (const [index, element] of Array.from(
		document.querySelectorAll('script[type="application/ld+json" i]'),
	).entries()) {
		try {
			collectStructuredDataNodes(JSON.parse(element.textContent), nodes);
		} catch (error) {
			errors.push({
			index,
			message: error instanceof Error ? error.message : String(error),
		});
		}
	}

	return { nodes, errors };
};

/** 배열과 @graph 컨테이너에서 실제 선언 노드를 수집합니다. */
const collectStructuredDataNodes = (value, nodes) => {
	if (Array.isArray(value)) {
		for (const item of value) {
			collectStructuredDataNodes(item, nodes);
		}
		return;
	}
	if (!value || typeof value !== "object") {
		return;
	}
	if (Array.isArray(value["@graph"])) {
		collectStructuredDataNodes(value["@graph"], nodes);
	}
	if (value["@type"]) {
		nodes.push(value);
	}
};

/** 지원하는 구조화 데이터 선언에서 검색엔진이 요구하는 최소 필드를 검사합니다. */
export const getStructuredDataIssues = (structuredData) => {
	const issues = structuredData.errors.map((error) => ({
		severity: "error",
		code: "JSON_LD_INVALID_JSON",
		field: `jsonLd[${error.index}]`,
		message: `JSON-LD 구문 오류: ${error.message}`,
	}));
	for (const node of structuredData.nodes) {
		const types = Array.isArray(node["@type"])
			? node["@type"]
			: [node["@type"]];
		for (const type of types.filter((item) =>
			SUPPORTED_STRUCTURED_DATA_TYPES.has(item),
		)) {
			for (const field of getRequiredStructuredDataFields(type, node)) {
				issues.push({
					severity: "warning",
					code: "JSON_LD_REQUIRED_FIELD_MISSING",
					field: `${type}.${field}`,
					message: `JSON-LD ${type} 필수 필드 누락: ${field}`,
				});
			}
		}
	}

	return issues;
};

/** 선언 타입별 최소 구조에서 누락된 필드를 반환합니다. */
const getRequiredStructuredDataFields = (type, node) => {
	const fields = {
		Organization: ["name", "url"],
		SoftwareApplication: ["name", "applicationCategory", "operatingSystem"],
		WebPage: ["name", "url"],
		FAQPage: ["mainEntity"],
	}[type];
	const missing = fields.filter((field) => !hasStructuredValue(node[field]));
	if (
		type === "FAQPage" &&
		Array.isArray(node.mainEntity) &&
		node.mainEntity.some(
			(item) =>
			!hasStructuredValue(item?.name) ||
			!hasStructuredValue(item?.acceptedAnswer?.text),
		)
	) {
		missing.push("mainEntity.name/acceptedAnswer.text");
	}

	return missing;
};

/** 빈 문자열·빈 배열·null을 구조화 데이터 값으로 인정하지 않습니다. */
const hasStructuredValue = (value) => {
	if (Array.isArray(value)) {
		return value.length > 0;
	}

	return value !== null && value !== undefined && value !== "";
};
