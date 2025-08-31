import bundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";
import { CLIENT_CONFIG } from "@web-memo/env";

/** @type {import('next').NextConfig} */
const nextConfig = {
	images: {
		remotePatterns: [
			{
				hostname: "**",
			},
		],
	},
	compiler: {
		removeConsole: process.env.NODE_ENV === "production",
	},
	experimental: {
		optimizePackageImports: ["@web-memo/ui"],
	},
};

const withBundleAnalyzer = bundleAnalyzer({
	enabled: process.env.ANALYZE === "true",
});

export default withSentryConfig(withBundleAnalyzer(nextConfig), {
	org: "guesung",
	project: "web-memo",
	authToken: CLIENT_CONFIG.sentryAuthToken,
	sourcemaps: {
		deleteSourcemapsAfterUpload: true,
	},
	telemetry: false,
});
