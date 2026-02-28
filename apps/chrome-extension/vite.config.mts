import { watchPublicPlugin, watchRebuildPlugin } from "@web-memo/hmr";
import { isDev, isProduction, watchOption } from "@web-memo/vite-config";
import { resolve } from "path";
import { defineConfig } from "vite";
import makeManifestPlugin from "./utils/plugins/make-manifest-plugin";

const rootDir = resolve(__dirname);
const libDir = resolve(rootDir, "lib");

const outDir = resolve(rootDir, "..", "..", "dist");
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
