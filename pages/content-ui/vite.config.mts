import { resolve } from "path";
import { makeEntryPointPlugin } from "@extension/hmr";
import { withPageConfig, isDev } from "@extension/vite-config";
import svgr from "vite-plugin-svgr";

const rootDir = resolve(__dirname);
const srcDir = resolve(rootDir, "src");

export default withPageConfig({
	resolve: {
		alias: {
			"@src": srcDir,
		},
	},
	plugins: [
		isDev && makeEntryPointPlugin(),
		svgr({
			// svgr options: https://react-svgr.com/docs/options/
			svgrOptions: {
				exportType: "default",
				ref: true,
				svgo: false,
				titleProp: true,
			},
			include: "**/*.svg",
		}),
	],
	publicDir: resolve(rootDir, "public"),
	build: {
		lib: {
			entry: resolve(srcDir, "index.tsx"),
			name: "contentUI",
			formats: ["iife"],
			fileName: "index",
		},
		outDir: resolve(rootDir, "..", "..", "dist", "content-ui"),
	},
});
