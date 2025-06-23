import { sentryVitePlugin } from "@sentry/vite-plugin";
import react from "@vitejs/plugin-react-swc";
import { watchRebuildPlugin } from "@web-memo/hmr";
import deepmerge from "deepmerge";
import dotenv from "dotenv";
import { defineConfig } from "vite";
import { isDev, isProduction } from "./env.mjs";
dotenv.config();

export const watchOption = isDev
	? {
			buildDelay: 50,
			chokidar: {
				ignored: [/\/packages\/.*\.(ts|tsx|map)$/],
			},
		}
	: undefined;

/**
 * @typedef {import('vite').UserConfig} UserConfig
 * @param {UserConfig} config
 * @returns {UserConfig}
 */
export function withPageConfig(config) {
	return defineConfig(
		deepmerge(
			{
				base: "",
				plugins: [
					react(),
					isDev && watchRebuildPlugin({ refresh: true }),
					!isDev &&
						sentryVitePlugin({
							org: "guesung",
							project: "web-memo",
							authToken: process.env.VITE_SENTRY_AUTH_TOKEN,
						}),
				],
				build: {
					sourcemap: isDev,
					minify: isProduction,
					reportCompressedSize: isProduction,
					emptyOutDir: isProduction,
					watch: watchOption,
					rollupOptions: {
						external: ["chrome"],
					},
				},
				define: {
					"process.env.NODE_ENV": isDev ? `"development"` : `"production"`,
				},
			},
			config,
		),
	);
}
