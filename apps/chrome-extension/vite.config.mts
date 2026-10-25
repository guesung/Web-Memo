import { watchPublicPlugin, watchRebuildPlugin } from "@web-memo/hmr";
import { isDev, isProduction, watchOption } from "@web-memo/vite-config";
import { resolve } from "path";
import { defineConfig } from "vite";
import makeManifestPlugin from "./utils/plugins/make-manifest-plugin";

const rootDir = resolve(__dirname);
const libDir = resolve(rootDir, "lib");

const outDir = resolve(rootDir, "..", "..",  "dist");
export default defineConfig({
	resolve: {
		alias: {
			"@root": rootDir,
			"@lib": libDir,
			"@assets": resolve(libDir, "assets"),
		},
	},
	plugins: [
		watchPublicPlugin(),
		makeManifestPlugin({ outDir }),
		isDev && watchRebuildPlugin({ reload: true }),
	],
	publicDir: resolve(rootDir, "public"),
	// background는 service worker라 `process`가 없다. vite lib 모드는 `process.env.NODE_ENV`를
	// 치환하지 않아서, `@sentry/react` 같은 의존성이 이 값을 읽는 순간 서비스 워커가
	// `process is not defined`로 죽고 `onInstalled` 등 background 코드 전체가 실행되지 않는다.
	// 페이지 빌드(`withPageConfig`)가 이미 같은 값을 정의하므로 background도 똑같이 맞춘다.
	define: {
		"process.env.NODE_ENV": isDev ? `"development"` : `"production"`,
	},
	build: {
		lib: {
			formats: ["iife"],
			entry: resolve(__dirname, "lib/background/index.ts"),
			name: "BackgroundScript",
			fileName: "background",
		},
		outDir,
		emptyOutDir: false,
		sourcemap: isDev,
		minify: isProduction,
		reportCompressedSize: isProduction,
		watch: watchOption,
		rollupOptions: {
			external: ["chrome"],
		},
	},
});
