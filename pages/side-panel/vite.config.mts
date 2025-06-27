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
			open: true,
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
					if (id.includes("@sentry-internal+replay")) {
						return "@sentry-vendor";
					}
					if (
						id.includes("node_modules/react/") ||
						id.includes("node_modules/react-dom/")
					) {
						return "@react-vendor";
					}
				},
			},
		},
		minify: "esbuild",
	},
});
