import ChannelTalk from "@src/components/ChannelTalk";
import Header from "@src/components/Header";
import type { LanguageParams } from "@src/modules/i18n";
import { SUPPORTED_LANGUAGES } from "@src/modules/i18n";
import { AnalyticsUserTracking } from "@web-memo/shared/modules/analytics";
import { type PropsWithChildren, Suspense } from "react";

import { InitDayjs, JsonLD } from "../_components";
import { QueryProvider, ThemeProvider } from "./_components";
import { metadataEnglish, metadataKorean } from "./_constants";

interface ILngLayoutProps extends PropsWithChildren, LanguageParams {}

export async function generateStaticParams() {
	return SUPPORTED_LANGUAGES.map((lng) => ({ lng }));
}

/**
 * 로케일별 메타데이터를 만든다.
 *
 * @description
 * `metadataKorean`/`metadataEnglish`는 `metadataCommon`을 통해 `metadataBase`를,
 * 자체 `twitter` 필드를 이미 전부 포함하고 있어, 루트 레이아웃(`app/layout.tsx`)의
 * 기본 메타데이터와 병합되던 결과와 여기서 반환하는 값이 같다.
 */
export async function generateMetadata({ params }: LanguageParams) {
	const { lng } = await params;

	return lng === "ko" ? metadataKorean : metadataEnglish;
}

/**
 * 로케일에 종속된 UI를 담는 레이아웃.
 *
 * @description
 * `<html>`·`<body>`는 루트 레이아웃(`app/layout.tsx`)에서만 렌더한다. 이 레이아웃을
 * 루트로 쓰면(과거 구조) 이 세그먼트가 최상위 동적 세그먼트가 되어, 매칭되지 않는
 * 경로에서 Next가 `not-found.js` 트리를 제대로 그리지 못하는 문제가 있었다.
 */
export default async function LngLayout({ children, params }: ILngLayoutProps) {
	const { lng } = await params;

	return (
		<div className="min-h-screen">
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
