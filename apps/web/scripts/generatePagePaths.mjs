import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * apps/web/src/app/[lng] 아래 page.tsx를 훑어 페이지 경로 상수를 생성한다.
 *
 * 사용:
 *   node scripts/generatePagePaths.mjs          # 생성 파일을 쓴다
 *   node scripts/generatePagePaths.mjs --check  # 쓰지 않고, 커밋본과 다르면 exit 1
 *
 * 테스트용으로 --app-dir=<경로>, --out=<경로>를 받는다.
 */

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");

const readOption = (name, fallback) => {
	const prefix = `--${name}=`;
	const found = process.argv.find((arg) => arg.startsWith(prefix));

	return found ? resolve(found.slice(prefix.length)) : fallback;
};

const isCheckMode = process.argv.includes("--check");
const appDir = readOption(
	"app-dir",
	resolve(repoRoot, "apps/web/src/app/[lng]"),
);
const outFile = readOption(
	"out",
	resolve(repoRoot, "packages/shared/src/constants/generatedPagePaths.ts"),
);

const MANUAL_HINT = "Path.ts의 MANUAL_PATHS에 추가하라";

const findPageFiles = (dir) =>
	readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const fullPath = resolve(dir, entry.name);
		if (entry.isDirectory()) {
			return findPageFiles(fullPath);
		}
		if (entry.name === "page.tsx") {
			return [fullPath];
		}

		return [];
	});

const isRouteGroup = (segment) => /^\([^.][^)]*\)$/.test(segment);
const isInterceptingRoute = (segment) => /^\(\.{1,3}\)/.test(segment);
const isDynamicSegment = (segment) => segment.startsWith("[");
const isParallelRoute = (segment) => segment.startsWith("@");
const isPrivateFolder = (segment) => segment.startsWith("_");

/**
 * page.tsx 경로를 URL 경로로 바꾼다. 라우트가 아니면 null, 다룰 수 없는 모양이면 던진다.
 */
const toUrlPath = (pageFile) => {
	const segments = relative(appDir, dirname(pageFile))
		.split(sep)
		.filter(Boolean);
	const displayPath = relative(repoRoot, pageFile);

	if (segments.some(isPrivateFolder)) {
		return null;
	}
	if (segments.some(isInterceptingRoute)) {
		throw new Error(
			`인터셉트 라우트는 자동 생성 대상이 아니다. ${MANUAL_HINT}: ${displayPath}`,
		);
	}
	if (segments.some(isDynamicSegment)) {
		throw new Error(
			`동적 경로는 자동 생성 대상이 아니다. ${MANUAL_HINT}: ${displayPath}`,
		);
	}
	if (segments.some(isParallelRoute)) {
		throw new Error(
			`병렬 라우트는 자동 생성 대상이 아니다. ${MANUAL_HINT}: ${displayPath}`,
		);
	}

	const urlSegments = segments.filter((segment) => !isRouteGroup(segment));

	return `/${urlSegments.join("/")}`;
};

/**
 * `/use-cases/job-hunting` → `useCasesJobHunting`, `/` → `root`
 */
const toKey = (urlPath) => {
	if (urlPath === "/") {
		return "root";
	}

	const words = urlPath.split(/[/-]/).filter(Boolean);

	return words
		.map((word, index) =>
			index === 0 ? word : word[0].toUpperCase() + word.slice(1),
		)
		.join("");
};

const buildPagePaths = () => {
	const urlPaths = [
		...new Set(findPageFiles(appDir).map(toUrlPath).filter(Boolean)),
	].sort();
	if (urlPaths.length === 0) {
		throw new Error(`page.tsx를 하나도 찾지 못했다: ${appDir}`);
	}

	const pathByKey = new Map();

	for (const urlPath of urlPaths) {
		const key = toKey(urlPath);
		const existingPath = pathByKey.get(key);
		if (existingPath) {
			throw new Error(
				`두 경로가 같은 키 "${key}"가 된다: ${existingPath}, ${urlPath}. 폴더 이름을 바꾸거나 한쪽을 ${MANUAL_HINT}`,
			);
		}
		pathByKey.set(key, urlPath);
	}

	return pathByKey;
};

const render = (pathByKey) => {
	const lines = [...pathByKey].map(
		([key, urlPath]) => `\t${key}: "${urlPath}",`,
	);

	return [
		"// 이 파일은 apps/web/scripts/generatePagePaths.mjs가 생성한다. 직접 수정하지 않는다.",
		"// 페이지가 아닌 경로(외부 도메인·route handler 등)는 Path.ts의 MANUAL_PATHS에 둔다.",
		"",
		"/** apps/web/src/app/[lng] 아래 page.tsx에서 뽑은 웹 페이지 경로 */",
		"export const GENERATED_PAGE_PATHS = {",
		...lines,
		"};",
		"",
	].join("\n");
};

try {
	const content = render(buildPagePaths());

	if (isCheckMode) {
		const committed = existsSync(outFile) ? readFileSync(outFile, "utf8") : "";
		if (committed !== content) {
			console.error(
				`${relative(repoRoot, outFile)}가 페이지 구조와 다르다. pnpm -F @web-memo/web generate:paths 후 커밋하라`,
			);
			process.exit(1);
		}
	} else {
		writeFileSync(outFile, content, "utf8");
	}
} catch (error) {
	console.error(`[generatePagePaths] ${error.message}`);
	process.exit(1);
}
