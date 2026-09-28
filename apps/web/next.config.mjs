import { withSentryConfig } from "@sentry/nextjs/config";

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
	async redirects() {
		return [
			{
				// Vercel 기본 도메인이 운영과 같은 본문을 200으로 내보내면 구글이 그쪽을
				// 대표 URL로 골라 운영 페이지를 중복으로 처리합니다. 공개 페이지만 운영
				// 도메인으로 영구 이동시킵니다. /api·/auth는 옛 확장·OAuth 콜백이 이
				// 도메인을 부를 수 있어 그대로 둡니다.
				source: "/:path((?!api(?:/|$)|auth(?:/|$)).*)",
				has: [{ type: "host", value: "web-memos.vercel.app" }],
				destination: "https://www.webmemo.xyz/:path",
				permanent: true,
			},
		];
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
