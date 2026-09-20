import { withSentryConfig } from "@sentry/nextjs";

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
		// Next는 빌드할 때 NODE_ENV를 항상 production으로 두므로 staging을 구분하지
		// 못합니다. 앱 환경 축인 BUILD_ENV로 판정해 staging에서는 콘솔을 남깁니다.
		// 테섭에서 로깅이 실제로 나가는지 확인하는 유일한 수단입니다.
		removeConsole: process.env.BUILD_ENV === "production",
	},
};

export default withSentryConfig(nextConfig, {
	org: "guesung",
	project: "web-memo-web",
	authToken: process.env.SENTRY_AUTH_TOKEN,
	sourcemaps: {
		deleteSourcemapsAfterUpload: true,
	},
	telemetry: false,
});
