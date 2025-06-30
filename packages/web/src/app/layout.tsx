import "@web-memo/ui/global.css";
import "../fonts/output/PretendardVariable.css";
import "./globals.css";

import { GoogleAnalytics, GoogleTagManager } from "@next/third-parties/google";
import { CONFIG } from "@src/constants";
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
				<GoogleAnalytics gaId={CONFIG.gaId} />
				<GoogleTagManager gtmId={CONFIG.gtmId} />
				<Toaster />
			</body>
		</html>
	);
}
