import { JSDOM } from "jsdom";

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

/** 스크립트를 실행하지 않고 서버 HTML의 메타데이터와 실제 본문을 추출합니다. */
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
	};
	document
		.querySelectorAll("script, style, template, noscript")
		.forEach((element) => element.remove());
	metadata.bodyText = document.body.textContent.replace(/\s+/g, " ").trim();
	dom.window.close();

	return metadata;
};

/** 응답과 SSR 메타데이터를 오류·경고로 판정합니다. 경고만 있으면 실행은 성공합니다. */
export const evaluatePage = (page) => {
	const issues = [];
	const add = (severity, message) => issues.push({ severity, message });
	if (page.failure) {
		add("error", `요청 실패: ${page.failure}`);
	}
	if (page.status !== null && (page.status < 200 || page.status >= 300)) {
		add("error", `HTTP ${page.status}`);
	}
	const contentTypePattern =
		{
			sitemap: /^(application|text)\/xml(?:\s*;|$)/i,
			robots: /^text\/plain(?:\s*;|$)/i,
		}[page.kind] ?? /^(text\/html|application\/xhtml\+xml)(?:\s*;|$)/i;
	if (page.status !== null && !contentTypePattern.test(page.contentType)) {
		add("error", `콘텐츠 유형 불일치: ${page.contentType || "없음"}`);
	}
	if (
		page.expectedDestination &&
		(page.finalUrl !== page.expectedDestination || page.redirects.length === 0)
	) {
		add(
			"error",
			`언어 루트 리다이렉트 불일치: 기대 ${page.expectedDestination}`,
		);
	}
	if (page.redirects.length > 0 && !page.expectedDestination) {
		add("warning", `리다이렉트 ${page.redirects.length}회: ${page.finalUrl}`);
	}
	const metadata = page.metadata;
	const robots = `${page.robotsHeader ?? ""}, ${metadata?.robots ?? ""}`;
	if (
		hasGooglebotNoindex(page.robotsHeader ?? "") ||
		hasGooglebotNoindex(metadata?.robots ?? "")
	) {
		add("error", `검색 색인 차단: ${robots}`);
	}
	if (!metadata) {
		return issues;
	}
	if (!metadata.bodyText) {
		add("error", "서버 HTML 본문이 비어 있음");
	}
	for (const [name, maximum] of [
		["title", 60],
		["description", 160],
	]) {
		const length = Array.from(metadata[name]).length;
		if (length === 0 || length > maximum) {
			add("warning", `${name} 길이: ${length}자 (권장 1~${maximum}자)`);
		}
	}
	if (metadata.canonical !== (page.expectedDestination ?? page.url)) {
		add("warning", `canonical 불일치: ${metadata.canonical || "없음"}`);
	}
	if (metadata.h1.length !== 1) {
		add("warning", `h1 개수: ${metadata.h1.length}`);
	}
	const expectedLanguage = new URL(page.url).pathname.split("/")[1];
	if (metadata.lang.toLowerCase().split("-")[0] !== expectedLanguage) {
		add("warning", `html lang 불일치: ${metadata.lang || "없음"}`);
	}
	for (const [name, value] of Object.entries(metadata.og)) {
		if (!value) {
			add("warning", `og:${name} 누락`);
		}
	}

	return issues;
};

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
						page.issues.push({
							severity: "warning",
							message: `${field} 중복: ${group.map((item) => item.url).join(", ")}`,
						});
					}
				}
			}
		}
	}
};

/** 판정 건수와 URL별 요청 결과를 JSON 및 Markdown에 공통으로 사용합니다. */
export const createReport = (pages) => {
	const issues = pages.flatMap((page) => page.issues);
	const report = {
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
				`- ${issue.severity === "error" ? "오류" : "경고"}: ${escapeMarkdown(issue.message)}`,
			);
		}
		if (page.issues.length === 0) {
			lines.push("문제 없음.");
		}
	}

	return { report, markdown: `${lines.join("\n")}\n` };
};
