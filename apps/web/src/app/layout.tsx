import "@web-memo/ui/global.css";
import "../fonts/output/PretendardVariable.css";
import "./globals.css";

import { GoogleAnalytics, GoogleTagManager } from "@next/third-parties/google";
import { CONFIG } from "@web-memo/env";
import { ANALYTICS } from "@web-memo/shared/constants";
import { ANALYTICS_EXCLUDED_STORAGE_KEY } from "@web-memo/shared/modules/analytics";
import { isProduction } from "@web-memo/shared/utils";
import { Toaster } from "@web-memo/ui";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
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
						{/*
						 * 만든 사람 본인의 자동 수집을 gtag가 뜨기 전에 끕니다.
						 * 로그인 여부는 세션을 복원한 뒤에야 알 수 있는데 그때는 page_view가
						 * 이미 나간 뒤라, 지난 방문에서 남긴 표식을 여기서 먼저 읽습니다.
						 */}
						<Script id="ga-disable-excluded" strategy="beforeInteractive">
							{`try{if(localStorage.getItem("${ANALYTICS_EXCLUDED_STORAGE_KEY}")==="1"){window["ga-disable-${ANALYTICS.gaId}"]=true}}catch(e){}`}
						</Script>
						{/*
						 * 확장에서 넘어온 사람의 GA client_id를 확장 것으로 맞춥니다.
						 * gtag는 `ext_client_id` 파라미터를 예약 필드(excid)로 바꿔 보내 커스텀
						 * 차원에 닿지 않으므로, gtag가 client_id를 정하기 전에 `_ga` 쿠키를 먼저
						 * 심어 확장과 웹이 같은 사용자로 집계되게 합니다. UUID 형식만 받아 조작된
						 * 링크로 남의 쿠키를 바꾸지 못하게 하고, 속성은 gtag가 쓰는 것과 같아야
						 * 쿠키가 둘로 갈리지 않습니다.
						 */}
						<Script
							id="ga-adopt-extension-client-id"
							strategy="beforeInteractive"
						>
							{`try{var m=location.search.match(/[?&]ext_cid=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(&|$)/i);if(m&&document.cookie.indexOf("_ga=GA1.1."+m[1])===-1){document.cookie="_ga=GA1.1."+m[1]+"; path=/; max-age=34560000; SameSite=Lax; domain=.webmemo.xyz"}}catch(e){}`}
						</Script>
						<GoogleAnalytics gaId={ANALYTICS.gaId} />
						<GoogleTagManager gtmId={ANALYTICS.gtmId} />
					</>
				)}
				<Toaster />
			</body>
		</html>
	);
}
