import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { runInNewContext } from "node:vm";
import { expect, it } from "vitest";

const requireFromApp = createRequire(
	join(process.cwd(), "apps/app/package.json"),
);
const routerRoot = dirname(requireFromApp.resolve("expo-router/package.json"));
const { resolveHref } = requireFromApp(
	join(routerRoot, "build/link/href.js"),
) as {
	resolveHref: (href: { pathname: string; params: { url: string } }) => string;
};
const { parseQueryParams } = requireFromApp(
	join(routerRoot, "build/fork/getStateFromPath-forks.js"),
) as {
	parseQueryParams: (path: string, route: { name: string }) => { url: string };
};

// 설치된 Expo Router hook 본문을 실행한다. Node에서 React Native entry를 로드하지 않도록
// hook과 무관한 의존성만 비워 둔다.
function readWithInstalledLocalSearchParams(url: string): string {
	const source = readFileSync(join(routerRoot, "build/hooks.js"), "utf8");
	const exports: Record<string, unknown> = {};
	const context = { params: { url } };
	const fakeRequire = (id: string): unknown => {
		if (id === "react") return { use: (value: typeof context) => value.params };
		if (id === "./Route") return { LocalRouteParamsContext: context };
		if (id === "./link/preview/PreviewRouteContext") {
			return { usePreviewInfo: () => ({}) };
		}
		return {};
	};
	runInNewContext(source, {
		exports,
		require: fakeRequire,
		process,
		URLSearchParams,
	});
	const hooks = exports as { useLocalSearchParams: () => { url: string } };
	return hooks.useLocalSearchParams().url;
}

it.each([
	"https://example.com/?q=100%25",
	"https://example.com/?q=literal%&next=a%26b",
	"https://example.com/?q=한글%20문장&next=a%26b#제목%25",
	"https://example.com/path?url=https%3A%2F%2Fother.example%2F%3Fa%3D1%26b%3D2#section%20one",
])(
	"Expo Router의 href→query parser→local params가 URL %s를 보존한다",
	(originalUrl) => {
		const href = resolveHref({
			pathname: "/(main)/browser",
			params: { url: encodeURIComponent(originalUrl) },
		});
		const parsed = parseQueryParams(href, { name: "browser" });
		expect(readWithInstalledLocalSearchParams(parsed.url)).toBe(originalUrl);
	},
);
