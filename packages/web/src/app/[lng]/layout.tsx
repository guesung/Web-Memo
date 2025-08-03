import Header from "@src/components/Header";
import type { LanguageParams } from "@src/modules/i18n";
import { SUPPORTED_LANGUAGES } from "@src/modules/i18n";
import { dir } from "i18next";
import type { PropsWithChildren } from "react";
import { InitDayjs } from "../_components";
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
			<ThemeProvider>
				<QueryProvider lng={lng}>
					<Header lng={lng} />
					{children}
				</QueryProvider>
			</ThemeProvider>

			<InitDayjs lng={lng} />
		</div>
	);
}
