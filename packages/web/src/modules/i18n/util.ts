import acceptLanguage from 'accept-language';
import type { InitOptions, Namespace } from 'i18next';
import type { NextRequest } from 'next/server';

import { cookieName, DEFAULT_LANGUAGE, defaultNS, SUPPORTED_LANGUAGES } from './constant';

export const getOptions = (lng = DEFAULT_LANGUAGE, ns: Namespace = defaultNS): InitOptions => ({
  supportedLngs: SUPPORTED_LANGUAGES,
  fallbackLng: DEFAULT_LANGUAGE,
  lng,
  fallbackNS: defaultNS,
  defaultNS,
  ns,
  initImmediate: false,
  debug: false,
  preload: SUPPORTED_LANGUAGES,
});

export const getLanguage = (request: NextRequest) => {
  acceptLanguage.languages([...SUPPORTED_LANGUAGES]);
  if (request.cookies.has(cookieName)) return acceptLanguage.get(request.cookies.get(cookieName)?.value);
  if (request.headers.get('Accept-Language')) return acceptLanguage.get(request.headers.get('Accept-Language'));
  if (request.headers.get('referer'))
    return SUPPORTED_LANGUAGES.find(language => request.headers.get('referer')?.startsWith(`/${language}`));
  return DEFAULT_LANGUAGE;
};
