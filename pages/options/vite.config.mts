import { withPageConfig } from "@web-memo/vite-config";
import { resolve } from "path";

const rootDir = resolve(__dirname);
const srcDir = resolve(rootDir, "src");

export default withPageConfig({
	resolve: {
		alias: {
			"@src": srcDir,
		},
	},
	publicDir: resolve(rootDir, "public"),
	build: {
		outDir: resolve(rootDir, "..", "..", "dist", "options"),
		sourcemap: true,
	},
});
