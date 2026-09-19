import ChannelTalk from "@src/components/ChannelTalk";
import Header from "@src/components/Header";
import type { LanguageParams } from "@src/modules/i18n";
import { SUPPORTED_LANGUAGES } from "@src/modules/i18n";
import { AnalyticsUserTracking } from "@web-memo/shared/modules/analytics";
import { dir } from "i18next";
import { type PropsWithChildren, Suspense } from "react";
import { InitDayjs, JsonLD } from "../_components";
import { HtmlLang, QueryProvider, ThemeProvider } from "./_components";
import { metadataEnglish, metadataKorean } from "./_constants";

interface RootLayoutProps extends PropsWithChildren, LanguageParams {}

export async function generateStaticParams() {
	return SUPPORTED_LANGUAGES.map((lng) => ({ lng }));
}

export async function generateMetadata({ params }: LanguageParams) {
	const { lng } = await params;

	return lng === "ko" ? metadataKorean : metadataEnglish;
}

export default async function RootLayout({
	children,
	params,
}: RootLayoutProps) {
	const { lng } = await params;

	return (
		<div lang={lng} dir={dir(lng)} className="min-h-screen">
			<HtmlLang lng={lng} />
			<JsonLD lng={lng} />
			<ThemeProvider>
				<QueryProvider lng={lng}>
					<Suspense>
						<AnalyticsUserTracking />
					</Suspense>
					<Header lng={lng} />
					{children}
					<ChannelTalk lng={lng} />
				</QueryProvider>
			</ThemeProvider>

			<InitDayjs lng={lng} />
		</div>
	);
}
