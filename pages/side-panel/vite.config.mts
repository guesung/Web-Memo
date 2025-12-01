import { withPageConfig } from "@web-memo/vite-config";
import { resolve } from "path";
import { visualizer } from "rollup-plugin-visualizer";

const rootDir = resolve(__dirname);
const srcDir = resolve(rootDir, "src");

export default withPageConfig({
	resolve: {
		alias: {
			"@src": srcDir,
		},
	},
	plugins: [
		visualizer({
			open: false,
			filename: "dist/stats.html",
			template: "treemap",
		}),
	],
	publicDir: resolve(rootDir, "public"),
	build: {
		outDir: resolve(rootDir, "..", "..", "dist", "side-panel"),
		sourcemap: true,
		rollupOptions: {
			treeshake: "recommended",
			output: {
				manualChunks(id: string) {
					// Sentry replay 분리
					if (id.includes("@sentry-internal+replay")) {
						return "@sentry-vendor";
					}
					// Sentry core 분리
					if (id.includes("@sentry/") && !id.includes("@sentry-internal")) {
						return "@sentry-core";
					}
					// React 코어 분리
					if (
						id.includes("node_modules/react/") ||
						id.includes("node_modules/react-dom/")
					) {
						return "@react-vendor";
					}
					// Markdown 관련 라이브러리 분리 (lazy loading 지원)
					if (
						id.includes("react-markdown") ||
						id.includes("remark-") ||
						id.includes("unified") ||
						id.includes("mdast") ||
						id.includes("micromark") ||
						id.includes("hast")
					) {
						return "@markdown-vendor";
					}
					// TanStack Query 분리
					if (id.includes("@tanstack/react-query")) {
						return "@tanstack-vendor";
					}
					// UI 라이브러리 분리
					if (id.includes("lucide-react") || id.includes("@radix-ui")) {
						return "@ui-vendor";
					}
				},
			},
		},
		minify: "esbuild",
	},
});
