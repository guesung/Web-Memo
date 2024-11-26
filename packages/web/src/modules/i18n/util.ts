import type { NextRequest } from 'next/server';
import { cookieName, defaultNS, fallbackLng, languages } from '.';

export const getOptions = (lng = fallbackLng, ns = defaultNS) => ({
  supportedLngs: languages,
  fallbackLng,
  lng,
  fallbackNS: defaultNS,
  defaultNS,
  ns,
});
import acceptLanguage from 'accept-language';

export const getLanguage = (request: NextRequest) => {
  acceptLanguage.languages([...languages]);
  if (request.cookies.has(cookieName)) return acceptLanguage.get(request.cookies.get(cookieName)?.value);
  if (request.headers.get('Accept-Language')) return acceptLanguage.get(request.headers.get('Accept-Language'));
  if (request.headers.get('referer'))
    return languages.find(language => request.headers.get('referer')?.startsWith(`/${language}`));
  return fallbackLng;
};
