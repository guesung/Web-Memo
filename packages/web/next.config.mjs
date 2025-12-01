import bundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";
import { CONFIG } from "@web-memo/env";

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
		optimizePackageImports: [
			"@web-memo/ui",
			"@web-memo/shared",
			"lucide-react",
			"framer-motion",
			"dayjs",
			"@tanstack/react-query",
		],
	},
	// 정적 자산 압축 활성화
	compress: true,
	// 소스맵 최적화 (프로덕션에서 숨김)
	productionBrowserSourceMaps: false,
};

const withBundleAnalyzer = bundleAnalyzer({
	enabled: process.env.ANALYZE === "true",
});

export default withSentryConfig(withBundleAnalyzer(nextConfig), {
	org: "guesung",
	project: "web-memo",
	authToken: CONFIG.sentryAuthToken,
	sourcemaps: {
		deleteSourcemapsAfterUpload: true,
	},
	telemetry: false,
});
