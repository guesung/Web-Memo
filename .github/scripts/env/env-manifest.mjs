/**
 * 환경 변수 매니페스트(.github/env-manifest.yml)를 읽고 코드·워크플로의 실제 참조와 대조합니다.
 *
 * 무엇이 어디에 등록돼 있어야 하는지를 적은 곳이 사람이 손으로 쓴 문서뿐이면, 코드가 바뀔 때
 * 그 문서가 따라오지 않아 어긋남이 에러 없이 쌓입니다. 이 모듈은 그 원천을 파일 하나로 모으고,
 * 코드에서 실제로 읽는 이름과 매번 대조합니다. 값은 어디서도 다루지 않고 이름만 다룹니다.
 *
 * 의존성 없이 돌아야 하므로(.github/scripts의 관례) YAML 전체를 해석하지 않고, 매니페스트가
 * 쓰는 부분집합만 해석합니다. 지원하지 않는 문법은 조용히 넘기지 않고 줄 번호와 함께 던집니다.
 */

/** 변수의 성격. secret=비밀, config=공개 설정값, platform=플랫폼이 주입(등록 안 함), flag=코드가 읽지 않는 빌드·플랫폼 플래그 */
export const MANIFEST_KINDS = ["secret", "config", "platform", "flag"];

/**
 * 변수를 읽는 시점. build는 turbo 태스크(build·ready·zip) 안에서 빌드 설정 파일이 셸에서 받아 읽는다는 뜻입니다.
 * turbo 2의 envMode는 기본 strict라, 이런 값은 turbo 설정에 선언하지 않으면 빌드가 조용히 못 봅니다.
 */
export const MANIFEST_PHASES = ["build"];

/** Vercel 프로젝트의 환경 세 가지 */
export const VERCEL_ENVIRONMENTS = ["production", "preview", "development"];

/**
 * 항목의 stores에서 Vercel에 등록돼야 하는 환경 집합을 구합니다.
 *
 * @description `vercel`은 세 환경 모두라는 뜻이고, `vercel:<환경>`은 그 환경만이라는 예외 표기입니다.
 * 웹의 값은 환경마다 같게 두는 것이 원칙이라 예외는 BUILD_ENV처럼 값이 환경마다 달라야 하는 것뿐입니다.
 */
export const vercelEnvironments = (stores) => {
	if (stores.includes("vercel")) {
		return new Set(VERCEL_ENVIRONMENTS);
	}

	return new Set(
		stores
			.filter((store) => store.startsWith("vercel:"))
			.map((store) => store.replace("vercel:", "")),
	);
};

export const isVercelStore = (store) =>
	store === "vercel" || store.startsWith("vercel:");

const NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const STORE_PATTERN =
	/^(github|supabase|envpkg|vercel|vercel:(production|preview|development))$/;

/** 워크플로의 secrets.* 참조에서 제외할 이름. Actions가 자동으로 제공합니다. */
const BUILTIN_SECRETS = new Set(["GITHUB_TOKEN"]);
/** import.meta.env에서 Vite가 넣어 주는 이름 */
const BUILTIN_VITE_ENV = new Set(["MODE", "DEV", "PROD", "SSR", "BASE_URL"]);

const CODE_FILE_PATTERN = /\.(ts|tsx|js|jsx|mjs|cjs|mts)$/;
const TEST_FILE_PATTERN = /\.(test|spec)\.[a-z]+$/;
const WORKFLOW_FILE_PATTERN = /^\.github\/workflows\/.+\.ya?ml$/;
/**
 * 배포·빌드되는 코드가 있는 곳. .github/scripts는 넣지 않습니다. 그 스크립트가 읽는 값은
 * 워크플로의 env 블록이 넘겨 주고, 그중 시크릿은 워크플로의 secrets.* 참조로 이미 잡힙니다.
 */
const CODE_ROOTS = ["apps/", "packages/", "pages/", "e2e/"];

export const DOCS_START_MARKER = "<!-- env-manifest:start -->";
export const DOCS_END_MARKER = "<!-- env-manifest:end -->";

const parseValue = (rawValue, lineNumber) => {
	const value = rawValue.trim();

	if (value.startsWith("[")) {
		if (!value.endsWith("]")) {
			throw new Error(`${lineNumber}번째 줄: 목록이 ]로 닫히지 않았습니다`);
		}

		return value
			.slice(1, -1)
			.split(",")
			.map((item) => item.trim())
			.filter((item) => item !== "");
	}

	if (value === "true") {
		return true;
	}

	if (value === "false") {
		return false;
	}

	if (value.startsWith('"')) {
		if (!value.endsWith('"') || value.length < 2) {
			throw new Error(`${lineNumber}번째 줄: 따옴표가 닫히지 않았습니다`);
		}

		return value.slice(1, -1);
	}

	// 따옴표 없는 값에 ": "나 " #"가 있으면 진짜 YAML 파서와 결과가 갈립니다.
	if (value.includes(": ") || value.includes(" #")) {
		throw new Error(
			`${lineNumber}번째 줄: ": "나 " #"가 든 값은 큰따옴표로 감싸야 합니다`,
		);
	}

	return value;
};

/**
 * 매니페스트 텍스트를 항목 배열로 바꿉니다.
 *
 * @description 형식은 `- name: X`로 항목을 열고, 이어서 두 칸 들여쓴 `key: value` 줄을
 * 적는 것이 전부입니다. 값은 문자열·true/false·`[a, b]` 목록만 받습니다.
 * 전체 줄 주석(`#`)과 빈 줄은 무시하고, 줄 끝 주석은 지원하지 않습니다.
 */
export const parseManifest = (text) => {
	const entries = [];
	let current = null;

	const lines = text.split("\n");

	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index];
		const lineNumber = index + 1;

		if (line.trim() === "" || line.trimStart().startsWith("#")) {
			continue;
		}

		const nameMatch = line.match(/^- name: (\S+)$/);

		if (nameMatch) {
			current = {
				name: nameMatch[1],
				kind: "",
				stores: [],
				consumers: [],
				impact: "",
				note: "",
				phase: "",
				required: true,
			};
			entries.push(current);

			continue;
		}

		const fieldMatch = line.match(/^ {2}([a-z]+): (.*)$/);

		if (!fieldMatch || current === null) {
			throw new Error(`${lineNumber}번째 줄을 해석할 수 없습니다: ${line}`);
		}

		const [, key, rawValue] = fieldMatch;

		if (!(key in current) || key === "name") {
			throw new Error(`${lineNumber}번째 줄: 알 수 없는 필드 ${key}`);
		}

		current[key] = parseValue(rawValue, lineNumber);
	}

	return entries;
};

/** 항목 자체의 형식 오류를 모아 돌려줍니다. 코드와 대조하기 전에 걸러낼 것들입니다. */
export const validateManifest = (entries) => {
	const errors = [];
	const seenNames = new Set();

	for (const entry of entries) {
		const label = entry.name;

		if (!NAME_PATTERN.test(entry.name)) {
			errors.push(`${label}: 이름 형식이 올바르지 않습니다`);
		}

		if (seenNames.has(entry.name)) {
			errors.push(`${label}: 이름이 중복됩니다`);
		}

		seenNames.add(entry.name);

		if (!MANIFEST_KINDS.includes(entry.kind)) {
			errors.push(
				`${label}: kind는 ${MANIFEST_KINDS.join(" | ")} 중 하나여야 합니다`,
			);
		}

		for (const store of entry.stores) {
			if (!STORE_PATTERN.test(store)) {
				errors.push(`${label}: 알 수 없는 저장 위치 ${store}`);
			}
		}

		if (
			entry.stores.includes("vercel") &&
			entry.stores.some((store) => store.startsWith("vercel:"))
		) {
			errors.push(
				`${label}: vercel(세 환경 모두)과 vercel:<환경>을 함께 적을 수 없습니다`,
			);
		}

		if (entry.kind === "platform" && entry.stores.length > 0) {
			errors.push(`${label}: platform은 등록하지 않는 값이라 stores가 비어야 합니다`);
		}

		if (
			(entry.kind === "secret" || entry.kind === "config") &&
			entry.stores.length === 0
		) {
			errors.push(`${label}: 어디에 등록하는 값인지 stores가 필요합니다`);
		}

		if (
			(entry.kind === "secret" || entry.kind === "config") &&
			entry.impact === ""
		) {
			errors.push(`${label}: 없으면 생기는 일(impact)이 필요합니다`);
		}

		if (entry.kind === "flag" && entry.note === "") {
			errors.push(
				`${label}: 코드가 읽지 않는 값이라 왜 필요한지 note가 필요합니다`,
			);
		}

		if (entry.phase !== "" && !MANIFEST_PHASES.includes(entry.phase)) {
			errors.push(`${label}: phase는 ${MANIFEST_PHASES.join(" | ")} 중 하나여야 합니다`);
		}

		if (entry.kind !== "flag" && entry.consumers.length === 0) {
			errors.push(`${label}: 이 값을 읽는 곳(consumers)이 필요합니다`);
		}
	}

	return errors;
};

/** 대조 대상이 되는 파일인지 판정합니다. 테스트 파일은 실제 환경을 읽지 않으므로 뺍니다. */
export const isScannedFile = (path) => {
	if (WORKFLOW_FILE_PATTERN.test(path)) {
		return true;
	}

	if (!CODE_FILE_PATTERN.test(path) || TEST_FILE_PATTERN.test(path)) {
		return false;
	}

	return CODE_ROOTS.some((root) => path.startsWith(root));
};

const matchAll = (text, pattern) =>
	[...text.matchAll(pattern)].map((match) => match[1]);

/**
 * 한 파일이 읽는 환경 변수 이름을 뽑습니다.
 * 워크플로는 `secrets.X`만, 코드는 process.env·import.meta.env·Deno.env·requireServerEnv·readServerEnv를 봅니다.
 *
 * @returns {{ name: string, source: "secrets" | "code" }[]}
 */
export const extractReferences = (path, content) => {
	if (WORKFLOW_FILE_PATTERN.test(path)) {
		return matchAll(content, /\bsecrets\.([A-Za-z_][A-Za-z0-9_]*)/g)
			.filter((name) => !BUILTIN_SECRETS.has(name))
			.map((name) => ({ name, source: "secrets" }));
	}

	const codeNames = [
		...matchAll(content, /\bprocess\.env\.([A-Za-z_][A-Za-z0-9_]*)/g),
		...matchAll(
			content,
			/\bprocess\.env\[\s*["']([A-Za-z_][A-Za-z0-9_]*)["']\s*\]/g,
		),
		...matchAll(content, /\bimport\.meta\.env\.([A-Za-z_][A-Za-z0-9_]*)/g).filter(
			(name) => !BUILTIN_VITE_ENV.has(name),
		),
		...matchAll(
			content,
			/\bDeno\.env\.get\(\s*["']([A-Za-z_][A-Za-z0-9_]*)["']\s*\)/g,
		),
		// 이름을 인자로 받아 process.env[name]으로 읽는 래퍼(apps/web의 utils/serverEnv.ts)
		...matchAll(
			content,
			/\b(?:require|read)ServerEnv\(\s*["']([A-Za-z_][A-Za-z0-9_]*)["']\s*\)/g,
		),
	];

	return codeNames.map((name) => ({ name, source: "code" }));
};

/** 파일 여러 개에서 이름별 참조 위치를 모읍니다. */
export const collectReferences = (files) => {
	const references = new Map();

	for (const file of files) {
		if (!isScannedFile(file.path)) {
			continue;
		}

		for (const { name, source } of extractReferences(file.path, file.content)) {
			const found = references.get(name) ?? [];

			found.push({ path: file.path, source });
			references.set(name, found);
		}
	}

	return references;
};

/** 코드가 읽는 이름이 매니페스트에 빠졌는지, 워크플로 시크릿이 github로 적혔는지 봅니다. */
export const checkReferences = ({ entries, references }) => {
	const errors = [];
	const entryByName = new Map(entries.map((entry) => [entry.name, entry]));

	for (const [name, found] of references) {
		const entry = entryByName.get(name);

		if (!entry) {
			errors.push(
				`${name}: ${found[0].path}에서 읽지만 .github/env-manifest.yml에 없습니다`,
			);

			continue;
		}

		const usedAsSecret = found.some((reference) => reference.source === "secrets");

		if (usedAsSecret && !entry.stores.includes("github")) {
			errors.push(
				`${name}: 워크플로가 secrets.${name}을 읽지만 stores에 github가 없습니다`,
			);
		}
	}

	return errors;
};

/**
 * 매니페스트의 consumers가 실제로 그 이름을 담고 있는지 봅니다.
 * github에 등록한다고 적힌 값은 워크플로가 하나도 안 읽으면 죽은 시크릿이므로 그것도 잡습니다.
 */
export const checkConsumers = ({ entries, readFile }) => {
	const errors = [];

	for (const entry of entries) {
		for (const consumer of entry.consumers) {
			const content = readFile(consumer);

			if (content === null) {
				errors.push(`${entry.name}: 소비처 ${consumer} 파일이 없습니다`);

				continue;
			}

			if (!content.includes(entry.name)) {
				errors.push(`${entry.name}: 소비처 ${consumer}가 이 이름을 참조하지 않습니다`);
			}
		}

		const readByWorkflow = entry.consumers.some((consumer) =>
			WORKFLOW_FILE_PATTERN.test(consumer),
		);

		if (entry.stores.includes("github") && !readByWorkflow) {
			errors.push(
				`${entry.name}: github에 등록한다고 적혔지만 이를 읽는 워크플로가 consumers에 없습니다`,
			);
		}
	}

	return errors;
};

/**
 * turbo가 선언 없이도 태스크에 넘겨 주는 이름(내장 passthrough). turbo 2.8.9 바이너리에서 뽑았습니다.
 * NEXT_PUBLIC_* 같은 프레임워크 접두사는 프레임워크 추론으로 따로 들어가지만 NEXT_*가 이미 덮습니다.
 */
const TURBO_BUILTIN_PASS_THROUGH_ENV = [
	"HOME", "USER", "TZ", "LANG", "SHELL", "PWD", "XDG_RUNTIME_DIR", "XAUTHORITY",
	"DBUS_SESSION_BUS_ADDRESS", "CI", "NODE_OPTIONS", "COREPACK_HOME", "LD_LIBRARY_PATH",
	"DYLD_FALLBACK_LIBRARY_PATH", "LIBPATH", "LD_PRELOAD", "DYLD_INSERT_LIBRARIES", "COLORTERM",
	"TERM", "TERM_PROGRAM", "DISPLAY", "TMP", "TEMP", "WINDIR", "ProgramFiles", "ProgramFiles(x86)",
	"VSCODE_*", "ELECTRON_RUN_AS_NODE", "DOCKER_*", "BUILDKIT_*", "COMPOSE_*", "JB_IDE_*",
	"JB_INTERPRETER", "_JETBRAINS_TEST_RUNNER_RUN_SCOPE_TYPE", "VERCEL", "VERCEL_*", "NEXT_*",
	"USE_OUTPUT_FOR_EDGE_FUNCTIONS", "NOW_BUILDER", "GITHUB_*", "RUNNER_*", "APPDATA", "PROGRAMDATA",
	"SYSTEMROOT", "SYSTEMDRIVE", "USERPROFILE", "HOMEDRIVE", "HOMEPATH", "PNPM_HOME",
	"NPM_CONFIG_STORE_DIR",
];

/** turbo의 env 패턴(`*` 와일드카드)이 이름과 맞는지 봅니다. */
const matchesTurboPattern = (pattern, name) => {
	if (!pattern.includes("*")) {
		return pattern === name;
	}

	const escaped = pattern
		.split("*")
		.map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
		.join(".*");

	return new RegExp(`^${escaped}$`).test(name);
};

export const isTurboBuiltinEnv = (name) =>
	TURBO_BUILTIN_PASS_THROUGH_ENV.some((pattern) => matchesTurboPattern(pattern, name));

/**
 * JSONC(주석·끝 쉼표 허용)를 해석합니다. turbo.jsonc가 이 형식입니다.
 *
 * @description 문자열 안의 `//`·`/*`는 건드리지 않도록 문자열 경계를 따라가며 주석만 지웁니다.
 */
export const parseJsonc = (text) => {
	let output = "";
	let index = 0;

	while (index < text.length) {
		const char = text[index];
		const next = text[index + 1];

		if (char === '"') {
			let end = index + 1;

			while (end < text.length && text[end] !== '"') {
				end += text[end] === "\\" ? 2 : 1;
			}

			output += text.slice(index, end + 1);
			index = end + 1;

			continue;
		}

		if (char === "/" && next === "/") {
			while (index < text.length && text[index] !== "\n") {
				index += 1;
			}

			continue;
		}

		if (char === "/" && next === "*") {
			const end = text.indexOf("*/", index + 2);

			index = end === -1 ? text.length : end + 2;

			continue;
		}

		output += char;
		index += 1;
	}

	return JSON.parse(output.replace(/,(\s*[}\]])/g, "$1"));
};

/**
 * turbo 설정 파일들에서 선언된 환경 변수 이름과 선언 위치를 모읍니다.
 * globalEnv·globalPassThroughEnv와 각 태스크의 env·passThroughEnv를 봅니다. `!`로 시작하는 제외 패턴은 뺍니다.
 *
 * @param configs `{ path, config }[]` — config는 해석을 마친 객체
 * @returns {Map<string, string[]>} 이름(또는 와일드카드 패턴) → 선언한 위치(`파일#필드`)
 */
export const collectTurboEnvDeclarations = (configs) => {
	const declarations = new Map();

	const add = (names, location) => {
		for (const name of names ?? []) {
			if (name.startsWith("!")) {
				continue;
			}

			const locations = declarations.get(name) ?? [];

			locations.push(location);
			declarations.set(name, locations);
		}
	};

	for (const { path, config } of configs) {
		add(config.globalEnv, `${path}#globalEnv`);
		add(config.globalPassThroughEnv, `${path}#globalPassThroughEnv`);

		for (const [taskName, task] of Object.entries(config.tasks ?? {})) {
			add(task.env, `${path}#tasks.${taskName}.env`);
			add(task.passThroughEnv, `${path}#tasks.${taskName}.passThroughEnv`);
		}
	}

	return declarations;
};

/**
 * 매니페스트의 phase: build 표시와 turbo 설정의 env 선언이 같은지 봅니다.
 *
 * @description 정방향: 빌드 중 읽는 값이 turbo에 선언되지 않으면 strict 모드가 조용히 걸러 빌드가 값을 못 봅니다.
 * 역방향: turbo에 선언된 이름은 매니페스트에 phase: build로 있어야 합니다. turbo 내장 passthrough에 걸리는 이름은
 * 선언과 무관하게 넘어가므로 양쪽 모두 검사하지 않고, 와일드카드 선언은 이름 하나로 대조할 수 없어 역방향에서 뺍니다.
 */
export const checkTurboEnv = ({ entries, declarations }) => {
	const errors = [];
	const entryByName = new Map(entries.map((entry) => [entry.name, entry]));
	const declaredPatterns = [...declarations.keys()];

	for (const entry of entries) {
		if (entry.phase !== "build" || isTurboBuiltinEnv(entry.name)) {
			continue;
		}

		const isDeclared = declaredPatterns.some((pattern) =>
			matchesTurboPattern(pattern, entry.name),
		);

		if (!isDeclared) {
			errors.push(
				`${entry.name}: phase: build인데 turbo 설정의 env·passThroughEnv 어디에도 없습니다. strict 모드라 빌드가 이 값을 못 봅니다`,
			);
		}
	}

	for (const [name, locations] of declarations) {
		if (name.includes("*") || isTurboBuiltinEnv(name)) {
			continue;
		}

		const entry = entryByName.get(name);

		if (!entry) {
			errors.push(`${name}: ${locations[0]}에 선언됐지만 .github/env-manifest.yml에 없습니다`);

			continue;
		}

		if (entry.phase !== "build") {
			errors.push(
				`${name}: ${locations[0]}에 선언됐지만 매니페스트에 phase: build가 없습니다`,
			);
		}
	}

	return errors;
};

const parseDotenvKeys = (text) =>
	matchAll(text, /^([A-Za-z_][A-Za-z0-9_]*)=/gm);

/**
 * `packages/env/.env.{환경}` 파일의 키와 매니페스트의 envpkg 선언이 같은지 봅니다.
 *
 * @param envpkgFiles `packages/env/.env.{환경}` 파일 이름과 내용
 */
export const checkDotenvFiles = ({ entries, envpkgFiles }) => {
	const errors = [];
	const envpkgDeclared = new Set(
		entries
			.filter((entry) => entry.stores.includes("envpkg"))
			.map((entry) => entry.name),
	);

	for (const [fileName, content] of Object.entries(envpkgFiles)) {
		const keys = new Set(parseDotenvKeys(content));

		for (const key of keys) {
			if (!envpkgDeclared.has(key)) {
				errors.push(`${key}: ${fileName}에 있지만 매니페스트에 envpkg로 적혀 있지 않습니다`);
			}
		}

		for (const name of envpkgDeclared) {
			if (!keys.has(name)) {
				errors.push(`${name}: 매니페스트는 envpkg라고 하지만 ${fileName}에 없습니다`);
			}
		}
	}

	return errors;
};

const escapeCell = (text) => text.replaceAll("|", "\\|").replaceAll("\n", " ");

const formatConsumers = (consumers) =>
	consumers.length === 0
		? "코드 밖"
		: consumers.map((consumer) => `\`${consumer}\``).join(", ");

const STORE_GROUPS = [
	{ title: "GitHub Secrets", match: (store) => store === "github" },
	{
		title: "Vercel 프로젝트 환경변수",
		match: (store) => isVercelStore(store),
	},
	{ title: "Supabase Edge Function secrets", match: (store) => store === "supabase" },
	{ title: "`packages/env/.env.{환경}`", match: (store) => store === "envpkg" },
];

const renderStoreTable = (group, entries) => {
	const rows = entries
		.map((entry) => ({
			entry,
			stores: entry.stores.filter((store) => group.match(store)),
		}))
		.filter(({ stores }) => stores.length > 0)
		.sort((a, b) => a.entry.name.localeCompare(b.entry.name));

	if (rows.length === 0) {
		return "";
	}

	const isVercel = group.title.startsWith("Vercel");
	const header = isVercel
		? "| 이름 | 환경 | 없으면 생기는 일 | 읽는 곳 |\n| --- | --- | --- | --- |"
		: "| 이름 | 없으면 생기는 일 | 읽는 곳 |\n| --- | --- | --- |";
	const body = rows
		.map(({ entry, stores }) => {
			const optional = entry.required ? "" : " (선택)";
			const impact = escapeCell(entry.impact || entry.note);
			const consumers = escapeCell(formatConsumers(entry.consumers));

			if (isVercel) {
				const environmentSet = vercelEnvironments(stores);
				const environments =
					environmentSet.size === VERCEL_ENVIRONMENTS.length
						? "전체"
						: [...environmentSet].join(", ");

				return `| \`${entry.name}\`${optional} | ${environments} | ${impact} | ${consumers} |`;
			}

			return `| \`${entry.name}\`${optional} | ${impact} | ${consumers} |`;
		})
		.join("\n");

	return `### ${group.title} (${rows.length}개)\n\n${header}\n${body}\n`;
};

const renderPlatformTable = (entries) => {
	const rows = entries
		.filter((entry) => entry.kind === "platform")
		.sort((a, b) => a.name.localeCompare(b.name));

	if (rows.length === 0) {
		return "";
	}

	const body = rows
		.map(
			(entry) =>
				`| \`${entry.name}\` | ${escapeCell(entry.note)} | ${escapeCell(formatConsumers(entry.consumers))} |`,
		)
		.join("\n");

	return `### 플랫폼이 주입하는 값 (등록하지 않음)\n\n| 이름 | 주입하는 곳 | 읽는 곳 |\n| --- | --- | --- |\n${body}\n`;
};

/** 매니페스트에서 문서에 넣을 전체 목록(마크다운)을 만듭니다. */
export const renderInventory = (entries) =>
	[
		...STORE_GROUPS.map((group) => renderStoreTable(group, entries)),
		renderPlatformTable(entries),
	]
		.filter((section) => section !== "")
		.join("\n");

/** 문서의 시작·끝 표식 사이를 생성한 목록으로 바꾼 전문을 돌려줍니다. */
export const renderDocs = (docText, entries) => {
	const start = docText.indexOf(DOCS_START_MARKER);
	const end = docText.indexOf(DOCS_END_MARKER);

	if (start === -1 || end === -1 || end < start) {
		throw new Error(
			`문서에 ${DOCS_START_MARKER} 와 ${DOCS_END_MARKER} 표식이 필요합니다`,
		);
	}

	const before = docText.slice(0, start + DOCS_START_MARKER.length);
	const after = docText.slice(end);

	return `${before}\n\n${renderInventory(entries)}\n${after}`;
};
