import "@web-memo/ui/global.css";
import "../fonts/output/PretendardVariable.css";
import "./globals.css";

import NotFoundSection from "@src/app/_components/NotFoundSection";
import { QueryProvider, ThemeProvider } from "@src/app/[lng]/_components";
import Header from "@src/components/Header";
import { getLanguageFromPathname } from "@src/modules/i18n";
import { dir } from "i18next";
import type { Metadata } from "next";
import { headers } from "next/headers";

import { metadataEnglish, metadataKorean } from "./[lng]/_constants";

/**
 * 매칭되는 라우트가 아예 없는 요청의 전역 404.
 *
 * @description 루트 레이아웃이 `[lng]` 동적 세그먼트라 `not-found.js` 트리를 SSR로 못
 * 그려(Next 16.3.5), `experimental.globalNotFound`로 라우팅 단계에서 이 파일이 직접
 * 완전한 HTML 문서를 반환하게 한다. 레이아웃을 거치지 않으므로 전역 스타일·폰트를
 * 직접 import하고, `<html lang>`도 middleware가 `x-pathname` 헤더로 넘긴 경로를 읽어
 * 직접 계산한다. 헤더가 보이도록 `[lng]/layout.tsx`와 같은 Provider로 감싼다.
 */
export default async function GlobalNotFound() {
	const headerList = await headers();
	const lng = getLanguageFromPathname(headerList.get("x-pathname") ?? "");

	return (
		<html lang={lng} dir={dir(lng)} suppressHydrationWarning>
			<body>
				<ThemeProvider>
					<QueryProvider lng={lng}>
						<Header lng={lng} />
						<NotFoundSection lng={lng} />
					</QueryProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}

/**
 * 전역 404의 메타데이터. 기존 `[lng]/not-found.tsx`가 레이아웃의 `generateMetadata`를
 * 그대로 물려받던 것과 같은 제목·설명을 내도록 같은 상수를 재사용한다.
 */
export async function generateMetadata(): Promise<Metadata> {
	const headerList = await headers();
	const lng = getLanguageFromPathname(headerList.get("x-pathname") ?? "");

	return lng === "ko" ? metadataKorean : metadataEnglish;
}
