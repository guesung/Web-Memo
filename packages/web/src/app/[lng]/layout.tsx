import Header from "@src/components/Header";
import type { LanguageParams } from "@src/modules/i18n";
import { SUPPORTED_LANGUAGES } from "@src/modules/i18n";
import { AnalyticsUserTracking } from "@web-memo/shared/modules/analytics";
import { dir } from "i18next";
import { type PropsWithChildren, Suspense } from "react";
import { InitDayjs, JsonLD } from "../_components";
import { QueryProvider, ThemeProvider } from "./_components";
import { metadataEnglish, metadataKorean } from "./_constants";

interface RootLayoutProps extends PropsWithChildren, LanguageParams {}

export async function generateStaticParams() {
	return SUPPORTED_LANGUAGES.map((lng) => ({ lng }));
}

export async function generateMetadata({ params }: LanguageParams) {
	return params.lng === "ko" ? metadataKorean : metadataEnglish;
}

export default function RootLayout({
	children,
	params: { lng },
}: RootLayoutProps) {
	return (
		<div lang={lng} dir={dir(lng)} className="h-screen">
			<JsonLD lng={lng} />
			<ThemeProvider>
				<QueryProvider>
					<Suspense>
						<AnalyticsUserTracking />
					</Suspense>
					<Header lng={lng} />
					{children}
				</QueryProvider>
			</ThemeProvider>

			<InitDayjs lng={lng} />
		</div>
	);
}
