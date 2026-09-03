import { CONFIG } from "@web-memo/env";
import acceptLanguage from "accept-language";
import type { InitOptions, Namespace } from "i18next";
import type { NextRequest } from "next/server";

import {
	cookieName,
	DEFAULT_LANGUAGE,
	defaultNS,
	SUPPORTED_LANGUAGES,
} from "./constant";

export const getOptions = (
	lng = DEFAULT_LANGUAGE,
	ns: Namespace = defaultNS,
): InitOptions => ({
	supportedLngs: SUPPORTED_LANGUAGES,
	fallbackLng: DEFAULT_LANGUAGE,
	lng,
	fallbackNS: defaultNS,
	defaultNS,
	ns,
	initImmediate: false,
	debug: false,
	preload: SUPPORTED_LANGUAGES,
	// 문구 안에 도메인을 박아두면 도메인이 바뀔 때마다 ko/en 양쪽을 손으로 고쳐야
	// 합니다. 기본 보간 변수로 넣어 두면 translation.json이 {{webHost}}만 쓰고,
	// t() 호출부는 아무것도 넘기지 않아도 됩니다.
	interpolation: {
		defaultVariables: { webHost: CONFIG.webHost },
	},
});

export const getLanguage = (request: NextRequest) => {
	acceptLanguage.languages([...SUPPORTED_LANGUAGES]);
	if (request.cookies.has(cookieName))
		return acceptLanguage.get(request.cookies.get(cookieName)?.value);
	if (request.headers.get("Accept-Language"))
		return acceptLanguage.get(request.headers.get("Accept-Language"));
	if (request.headers.get("referer"))
		return SUPPORTED_LANGUAGES.find((language) =>
			request.headers.get("referer")?.startsWith(`/${language}`),
		);
	return DEFAULT_LANGUAGE;
};
