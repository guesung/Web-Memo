import "@web-memo/ui/global.css";
import "../fonts/output/PretendardVariable.css";
import "./globals.css";

import { GoogleAnalytics, GoogleTagManager } from "@next/third-parties/google";
import { CONFIG } from "@web-memo/env";
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
				<GoogleAnalytics gaId={CONFIG.gaId} />
				<GoogleTagManager gtmId={CONFIG.gtmId} />
				<Toaster />
			</body>
		</html>
	);
}
