import "@web-memo/ui/global.css";
import "../fonts/output/PretendardVariable.css";
import "./globals.css";

import { GoogleAnalytics, GoogleTagManager } from "@next/third-parties/google";
import { CLIENT_CONFIG } from "@web-memo/env";
import { Toaster } from "@web-memo/ui";
import type { Viewport } from "next";
import type { PropsWithChildren } from "react";
import { WebVitals } from "./_components";

interface LayoutProps extends PropsWithChildren {}

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
};

export default function Layout({ children }: LayoutProps) {
	return (
		<html suppressHydrationWarning lang="ko">
			<body>
				{children}

				<WebVitals />
				<GoogleAnalytics gaId={CLIENT_CONFIG.gaId} />
				<GoogleTagManager gtmId={CLIENT_CONFIG.gtmId} />
				<Toaster />
			</body>
		</html>
	);
}
