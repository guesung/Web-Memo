"use client";

import type { Language } from "@src/modules/i18n";
import { useEffect } from "react";

/**
 * 문서 최상위 `<html lang>`을 현재 로케일로 교정한다.
 *
 * @description
 * root layout(`app/layout.tsx`)이 `[lng]` 세그먼트 위에 있어 `<html lang>`이
 * "ko"로 고정돼 있다. SSR에서 정확히 맞추려면 root에서 headers()를 읽어야 하는데,
 * 그러면 전 페이지가 동적 렌더링으로 바뀌어 정적 생성 이점을 잃는다.
 * ponytail: JS 렌더링 크롤러(Googlebot) 기준으로만 교정한다. 완전한 SSR 정확성이
 * 필요해지면 middleware에서 x-lng 헤더를 내려 root layout이 읽도록 승급.
 */
interface HtmlLangProps {
	lng: Language;
}

export default function HtmlLang({ lng }: HtmlLangProps) {
	useEffect(() => {
		document.documentElement.lang = lng;
	}, [lng]);

	return null;
}
