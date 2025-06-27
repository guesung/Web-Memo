import { sentryVitePlugin } from "@sentry/vite-plugin";
import react from "@vitejs/plugin-react-swc";
import { CONFIG } from "@web-memo/env";
import { watchRebuildPlugin } from "@web-memo/hmr";
import deepmerge from "deepmerge";
import { defineConfig } from "vite";
import { isDev, isProduction } from "./env.mjs";

export const watchOption = isDev
	? {
			buildDelay: 50,
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
							authToken: CONFIG.sentryAuthToken,
							telemetry: false,
							bundleSizeOptimizations: {
								excludeDebugStatements: true,
								excludePerformanceMonitoring: true,
								excludeReplayIframe: true,
								excludeTracing: true,
								excludeReplayShadowDom: true,
								excludeReplayWorker: true,
							},
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
