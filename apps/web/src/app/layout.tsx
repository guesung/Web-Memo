import "@web-memo/ui/global.css";
import "../fonts/output/PretendardVariable.css";
import "./globals.css";

import { GoogleAnalytics, GoogleTagManager } from "@next/third-parties/google";
import { CONFIG } from "@web-memo/env";
import { ANALYTICS } from "@web-memo/shared/constants";
import { isProduction } from "@web-memo/shared/utils";
import { Toaster } from "@web-memo/ui";
import type { Metadata, Viewport } from "next";
import type { PropsWithChildren } from "react";
import { WebVitals } from "./_components";

interface LayoutProps extends PropsWithChildren {}

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
};

/**
 * 전역 메타데이터 기본값.
 * metadataBase로 하위 페이지의 상대경로 OG/Twitter 이미지를 절대 URL로 해석한다.
 */
export const metadata: Metadata = {
	metadataBase: new URL(CONFIG.webUrl),
	twitter: {
		card: "summary_large_image",
		images: ["/og-image.png"],
	},
};

export default function Layout({ children }: LayoutProps) {
	return (
		<html lang="ko" suppressHydrationWarning>
			<body>
				{children}

				<WebVitals />
				{/*
				 * 개발 환경에서는 GA 스크립트를 아예 싣지 않습니다.
				 * Analytics.ts의 전송 게이트는 우리 커스텀 이벤트만 막고, gtag가 자동으로
				 * 보내는 page_view·scroll·session_start 등은 그대로 나갑니다. 이 레포는
				 * 공개돼 있어 클론한 사람이 로컬에서 돌리면 그 이벤트가 운영 속성으로
				 * 들어오고, 실제로 30일 트래픽의 99%가 localhost에서 온 것이었습니다.
				 */}
				{isProduction() && (
					<>
						<GoogleAnalytics gaId={ANALYTICS.gaId} />
						<GoogleTagManager gtmId={ANALYTICS.gtmId} />
					</>
				)}
				<Toaster />
			</body>
		</html>
	);
}
