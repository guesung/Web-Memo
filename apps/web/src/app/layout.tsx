import "@web-memo/ui/global.css";
import "./globals.css";

import { GoogleAnalytics, GoogleTagManager } from "@next/third-parties/google";
import { CONFIG } from "@web-memo/env";
import { Toaster } from "@web-memo/ui";
import type { Viewport } from "next";
import type { PropsWithChildren } from "react";
import { WebVitals } from "./_components";
import { pretendard } from "./_constants/Font";

interface LayoutProps extends PropsWithChildren {}

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
};

export default function Layout({ children }: LayoutProps) {
	return (
		<html lang="ko" suppressHydrationWarning className={pretendard.variable}>
			<body className={pretendard.className}>
				{children}

				<WebVitals />
				<GoogleAnalytics gaId={CONFIG.gaId} />
				<GoogleTagManager gtmId={CONFIG.gtmId} />
				<Toaster />
			</body>
		</html>
	);
}
