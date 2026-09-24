import { getStructuredDataIssues, parseSeoHtml } from "./seo-html.mjs";
/** HTML SEO 파서를 기존 import 경로에서도 사용할 수 있게 제공합니다. */
export { parseSeoHtml };
/** Googlebot 그룹에서 URL 경로에 가장 구체적으로 일치하는 규칙을 적용합니다. */
export const isGooglebotBlocked = (robotsText, path = "/") => {
	const groups = [];
	let group = { agents: [], rules: [] };
	for (const line of robotsText.split(/\r?\n/)) {
		const match = line.replace(/#.*/, "").match(/^\s*([\w-]+)\s*:\s*(.*?)\s*$/);
		if (!match) {
			continue;
		}
		const name = match[1].toLowerCase();
		const value = match[2];
		if (name === "user-agent") {
			if (group.rules.length > 0) {
				groups.push(group);
				group = { agents: [], rules: [] };
			}
			group.agents.push(value.toLowerCase());
		} else if (name === "allow" || name === "disallow") {
			group.rules.push({ name, value });
		}
	}
	groups.push(group);
	let applicable = groups.filter((item) => item.agents.includes("googlebot"));
	if (applicable.length === 0) {
		applicable = groups.filter((item) => item.agents.includes("*"));
	}
	const rules = applicable.flatMap((item) => item.rules);
	let strongest = { name: "allow", specificity: -1 };
	for (const rule of rules) {
		if (!rule.value) {
			continue;
		}
		const pattern = rule.value
			.replace(/\$$/, "")
			.split("*")
			.map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
			.join(".*");
		if (
			!new RegExp(`^${pattern}${rule.value.endsWith("$") ? "$" : ""}`).test(
				path,
			)
		) {
			continue;
		}
		const specificity = Buffer.byteLength(rule.value.replace(/[*$]/g, ""));
		if (
			specificity > strongest.specificity ||
			(specificity === strongest.specificity && rule.name === "allow")
		) {
			strongest = { name: rule.name, specificity };
		}
	}
	return strongest.name === "disallow";
};

/** 헤더의 봇 범위를 유지해 Googlebot과 무관한 noindex를 제외합니다. */
export const hasGooglebotNoindex = (header) => {
	let scope = "";
	for (const segment of header.split(",")) {
		let directive = segment.trim().toLowerCase();
		const scoped = directive.match(/^([\w*-]+)\s*:\s*(.*)$/);
		if (
			scoped &&
			![
				"unavailable_after",
				"max-snippet",
				"max-image-preview",
				"max-video-preview",
			].includes(scoped[1])
		) {
			scope = scoped[1];
			directive = scoped[2];
		}
		if (
			["", "*", "googlebot"].includes(scope) &&
			/(?:^|[\s;])(noindex|none)(?=$|[\s;])/i.test(directive)
		) {
			return true;
		}
	}
	return false;
};

/** 응답과 SSR 메타데이터를 오류·경고로 판정합니다. 경고만 있으면 실행은 성공합니다. */
export const evaluatePage = (page) => {
	const issues = [];
	const add = (severity, code, message, field) =>
		issues.push({ severity, code, ...(field ? { field } : {}), message });
	if (page.failure) {
		add("error", "REQUEST_FAILED", `요청 실패: ${page.failure}`);
	}
	if (page.status !== null && (page.status < 200 || page.status >= 300)) {
		add("error", "HTTP_STATUS_ERROR", `HTTP ${page.status}`);
	}
	const contentTypePattern =
		{
			sitemap: /^(application|text)\/xml(?:\s*;|$)/i,
			robots: /^text\/plain(?:\s*;|$)/i,
		}[page.kind] ?? /^(text\/html|application\/xhtml\+xml)(?:\s*;|$)/i;
	if (page.status !== null && !contentTypePattern.test(page.contentType)) {
		add(
			"error",
			"CONTENT_TYPE_INVALID",
			`콘텐츠 유형 불일치: ${page.contentType || "없음"}`,
			"contentType",
		);
	}
	if (
		page.expectedDestination &&
		(page.finalUrl !== page.expectedDestination || page.redirects.length === 0)
	) {
		add(
			"error",
			page.kind === "normalization"
				? "URL_NORMALIZATION_FAILED"
				: "EXPECTED_REDIRECT_MISSING",
			`최종 URL 수렴 실패: 기대 ${page.expectedDestination}`,
			"finalUrl",
		);
	}
	if (page.kind === "normalization" && page.redirects.some((redirect) => [302, 303, 307].includes(redirect.status))) {
		add(
			"warning",
			"URL_NORMALIZATION_TEMPORARY_REDIRECT",
			`임시 리다이렉트로 정규 URL에 수렴함: ${page.finalUrl}`,
			"redirects",
		);
	} else if (page.redirects.length > 0 && !page.expectedDestination) {
		add(
			"warning",
			"UNEXPECTED_REDIRECT",
			`리다이렉트 ${page.redirects.length}회: ${page.finalUrl}`,
			"redirects",
		);
	}
	if (page.kind === "normalization") {
		return issues;
	}
	const metadata = page.metadata;
	const robots = `${page.robotsHeader ?? ""}, ${metadata?.robots ?? ""}`;
	if (
		hasGooglebotNoindex(page.robotsHeader ?? "") ||
		hasGooglebotNoindex(metadata?.robots ?? "")
	) {
		add("error", "NOINDEX_DETECTED", `검색 색인 차단: ${robots}`, "robots");
	}
	if (!metadata) {
		return issues;
	}
	if (!metadata.bodyText) {
		add("error", "SSR_BODY_EMPTY", "서버 HTML 본문이 비어 있음", "bodyText");
	}
	for (const [name, maximum] of [
		["title", 60],
		["description", 160],
	]) {
		const length = Array.from(metadata[name]).length;
		if (length === 0 || length > maximum) {
			add(
				"warning",
				"META_LENGTH_OUT_OF_RANGE",
				`${name} 길이: ${length}자 (권장 1~${maximum}자)`,
				name,
			);
		}
	}
	if (metadata.canonical !== (page.expectedDestination ?? page.url)) {
		add(
			"warning",
			"CANONICAL_MISMATCH",
			`canonical 불일치: ${metadata.canonical || "없음"}`,
			"canonical",
		);
	}
	if (metadata.h1.length !== 1) {
		add("warning", "H1_COUNT_INVALID", `h1 개수: ${metadata.h1.length}`, "h1");
	}
	const expectedLanguage = new URL(page.url).pathname.split("/")[1];
	if (metadata.lang.toLowerCase().split("-")[0] !== expectedLanguage) {
		add(
			"warning",
			"HTML_LANG_MISMATCH",
			`html lang 불일치: ${metadata.lang || "없음"}`,
			"lang",
		);
	}
	for (const [name, value] of Object.entries(metadata.og)) {
		if (!value) {
			add("warning", "OG_FIELD_MISSING", `og:${name} 누락`, `og.${name}`);
		}
	}
	if (!metadata.twitter.card) {
		add("warning", "TWITTER_CARD_MISSING", "twitter:card 누락", "twitter.card");
	}
	for (const name of ["title", "description", "image"]) {
		if (!metadata.twitter[name] && !metadata.og[name]) {
			add(
				"warning",
				"TWITTER_FIELD_MISSING",
				`twitter:${name} 및 OG fallback 누락`,
				`twitter.${name}`,
			);
		}
	}
	issues.push(...getStructuredDataIssues(metadata.structuredData));
	return issues;
};

/** 판정 건수와 URL별 요청 결과를 JSON 및 Markdown에 공통으로 사용합니다. */
export const createReport = (pages) => {
	const issues = pages.flatMap((page) => page.issues);
	const report = {
		schemaVersion: 2,
		generatedAt: new Date().toISOString(),
		errors: issues.filter((issue) => issue.severity === "error").length,
		warnings: issues.filter((issue) => issue.severity === "warning").length,
		pages,
	};
	const escapeMarkdown = (value) =>
		String(value)
			.replace(
				/[&<>|]/g,
				(character) =>
					({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "|": "&#124;" })[
						character
					],
			)
			.replace(/[\r\n]+/g, " ");
	const lines = [
		"# Web Memo SEO 검사",
		"",
		`실행: ${report.generatedAt}`,
		"",
		`요청 ${pages.length}건 · 오류 ${report.errors}건 · 경고 ${report.warnings}건`,
		"",
		"| URL | 크롤러 | HTTP | 오류 | 경고 |",
		"| --- | --- | --- | --- | --- |",
	];
	for (const page of pages) {
		lines.push(
			`| ${escapeMarkdown(page.url)} | ${page.agent} | ${page.status ?? "실패"} | ${page.issues.filter((issue) => issue.severity === "error").length} | ${page.issues.filter((issue) => issue.severity === "warning").length} |`,
		);
	}
	for (const page of pages) {
		lines.push(
			"",
			`## ${escapeMarkdown(page.url)} (${page.agent})`,
			"",
			`최종 URL: ${escapeMarkdown(page.finalUrl)}`,
			"",
			`Content-Type: ${escapeMarkdown(page.contentType || "없음")}`,
			"",
		);
		for (const redirect of page.redirects) {
			lines.push(
				`- HTTP ${redirect.status}: ${escapeMarkdown(redirect.url)} → ${escapeMarkdown(redirect.destination)}`,
			);
		}
		for (const issue of page.issues) {
			lines.push(
				`- ${issue.severity === "error" ? "오류" : "경고"} [${escapeMarkdown(issue.code)}]${issue.field ? ` (${escapeMarkdown(issue.field)})` : ""}: ${escapeMarkdown(issue.message)}`,
			);
		}
		if (page.issues.length === 0) {
			lines.push("문제 없음.");
		}
	}

	return { report, markdown: `${lines.join("\n")}\n` };
};
