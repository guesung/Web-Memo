import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const here = dirname(fileURLToPath(import.meta.url));
const injectedDir = resolve(here, "../src/modules/highlight/injected");

const result = await build({
	entryPoints: [resolve(injectedDir, "entry.ts")],
	bundle: true,
	format: "iife",
	minify: true,
	// 앱의 최소 지원 환경에 맞춘다. iOS deployment target이 15.1(apps/app/ios/Podfile:19)이므로
	// safari15가 하한이다. safari17로 잡으면 CSS Custom Highlight API를 못 써서 폴백을 타는
	// 바로 그 사용자들(iOS 15.1~17.1)의 WebView에서 스크립트 자체가 파싱되지 않을 수 있다.
	target: ["safari15", "chrome105"],
	write: false,
});

const code = result.outputFiles[0].text;

writeFileSync(
	resolve(injectedDir, "highlightScript.ts"),
	`// 이 파일은 scripts/buildInjectedScript.mjs가 생성한다. 직접 수정하지 않는다.\n` +
		`/** WebView에 주입할 하이라이트 스크립트 (IIFE 번들) */\n` +
		`export const HIGHLIGHT_SCRIPT = ${JSON.stringify(code)};\n`,
	"utf8",
);

console.log(`highlightScript.ts 생성 완료 (${code.length} bytes)`);
