import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";

/**
 * 문구 사용처를 스캔할 루트 디렉토리(레포 루트 기준 상대 경로).
 * @description manifest.js는 디렉토리가 아니라 파일이라 따로 훑는다.
 */
export const SCAN_ROOTS = [
	"apps/web/src",
	"pages",
	"packages/shared",
	"apps/chrome-extension/lib",
];

/** manifest.js에서 `__MSG_x__`만 별도로 훑는다. */
export const MANIFEST_FILE = "apps/chrome-extension/manifest.js";

const SCANNED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs"]);
const IGNORED_DIR_NAMES = new Set([
	"node_modules",
	"dist",
	".next",
	"build",
	"coverage",
]);

/**
 * 스캔 루트를 훑어 `t("…")`(웹)·`I18n.get("…")`(확장)·`__MSG_x__`(manifest) 리터럴을 뽑는다.
 * @description 결과는 앱(web/extension)별로 키→[{file, line, location}] 맵이다. 어느 앱 키인지는 파일 위치로만 정한다.
 */
export const scanUsages = ({ repoRoot }) => {
	const usages = { web: {}, extension: {} };

	for (const root of SCAN_ROOTS) {
		const absoluteRoot = join(repoRoot, root);
		if (!existsAndIsDir(absoluteRoot)) {
			continue;
		}
		for (const filePath of listFiles(absoluteRoot)) {
			scanFile({ repoRoot, filePath, usages });
		}
	}

	const manifestPath = join(repoRoot, MANIFEST_FILE);
	if (existsAndIsFile(manifestPath)) {
		scanFile({ repoRoot, filePath: manifestPath, usages });
	}

	return usages;
};

const existsAndIsDir = (path) => {
	try {
		return statSync(path).isDirectory();
	} catch {
		return false;
	}
};

const existsAndIsFile = (path) => {
	try {
		return statSync(path).isFile();
	} catch {
		return false;
	}
};

const listFiles = (dir) =>
	readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		if (entry.isDirectory()) {
			if (IGNORED_DIR_NAMES.has(entry.name)) {
				return [];
			}

			return listFiles(join(dir, entry.name));
		}
		if (SCANNED_EXTENSIONS.has(extensionOf(entry.name))) {
			return [join(dir, entry.name)];
		}

		return [];
	});

const extensionOf = (fileName) => {
	const dotIndex = fileName.lastIndexOf(".");

	return dotIndex === -1 ? "" : fileName.slice(dotIndex);
};

const TRANSLATION_CALL_PATTERN = /\bt\(\s*["']([^"']+)["']/g;
const I18N_GET_PATTERN = /I18n\.get\(\s*["']([^"']+)["']/g;
const MANIFEST_MESSAGE_PATTERN = /__MSG_([A-Za-z0-9_]+)__/g;

const scanFile = ({ repoRoot, filePath, usages }) => {
	const relativePath = toPosix(relative(repoRoot, filePath));
	const isManifest = relativePath === MANIFEST_FILE;
	const isWeb = relativePath.startsWith("apps/web/");
	const app = isWeb ? "web" : "extension";
	const content = readFileSync(filePath, "utf8");
	const location = locateUsage(relativePath);

	if (isManifest) {
		collectMatches({
			content,
			pattern: MANIFEST_MESSAGE_PATTERN,
			usages: usages.extension,
			relativePath,
			location,
		});

		return;
	}

	collectMatches({
		content,
		pattern: TRANSLATION_CALL_PATTERN,
		usages: usages[app],
		relativePath,
		location,
	});
	collectMatches({
		content,
		pattern: I18N_GET_PATTERN,
		usages: usages[app],
		relativePath,
		location,
	});
};

const collectMatches = ({ content, pattern, usages, relativePath, location }) => {
	for (const match of content.matchAll(pattern)) {
		const key = match[1];
		const line = countLinesBefore(content, match.index) + 1;
		usages[key] ??= [];
		usages[key].push({ file: relativePath, line, location });
	}
};

const countLinesBefore = (content, index) => {
	let count = 0;
	for (let i = 0; i < index; i += 1) {
		if (content[i] === "\n") {
			count += 1;
		}
	}

	return count;
};

const toPosix = (path) => path.split(sep).join("/");

const isRouteGroup = (segment) => /^\([^.][^)]*\)$/.test(segment);

/**
 * 파일 위치를 사람이 읽는 라벨로 바꾼다.
 * @description 규칙은 apps/web/scripts/generatePagePaths.mjs:50-87의 라우트 세그먼트 판정을 따른다(그 파일은 실행 스크립트라 import할 수 없어 로직만 재구현).
 */
export const locateUsage = (relativePath) => {
	if (relativePath.startsWith("pages/side-panel/")) {
		return "side-panel";
	}
	if (relativePath.startsWith("pages/content-ui/")) {
		return "content-ui";
	}
	if (relativePath.startsWith("pages/options/")) {
		return "options";
	}
	if (relativePath.startsWith("apps/chrome-extension/lib/background/")) {
		return "background";
	}
	if (relativePath === MANIFEST_FILE) {
		return "manifest";
	}
	if (relativePath.startsWith("packages/shared/")) {
		return `공용 · ${relativePath}`;
	}

	const appDirPrefix = "apps/web/src/app/[lng]/";
	if (!relativePath.startsWith(appDirPrefix)) {
		return `공용 · ${relativePath}`;
	}

	const withinApp = relativePath.slice(appDirPrefix.length);
	const dirSegments = dirname(withinApp).split("/").filter((segment) => segment !== ".");

	const kept = [];
	let hitPrivateFolder = false;
	for (const segment of dirSegments) {
		if (isRouteGroup(segment)) {
			continue;
		}
		if (segment.startsWith("_")) {
			hitPrivateFolder = true;
			break;
		}
		kept.push(segment);
	}

	if (hitPrivateFolder && kept.length === 0) {
		return `공용 · ${relativePath}`;
	}

	return `/${kept.join("/")}`;
};
