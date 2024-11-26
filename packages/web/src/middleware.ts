import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from './utils';
import acceptLanguage from 'accept-language';
import { fallbackLng, languages, cookieName, Language } from './modules/i18n';

const getLanguage = (request: NextRequest) => {
  acceptLanguage.languages([...languages]);
  if (request.cookies.has(cookieName)) return acceptLanguage.get(request.cookies.get(cookieName)?.value);
  if (request.headers.get('Accept-Language')) return acceptLanguage.get(request.headers.get('Accept-Language'));
  if (request.headers.get('referer'))
    return languages.find(language => request.headers.get('referer')?.startsWith(`/${language}`));
  return fallbackLng;
};

export async function middleware(request: NextRequest) {
  const language = getLanguage(request);

  const isLanguagePath = languages.some(lng => request.nextUrl.pathname.startsWith(`/${lng}`));
  if (!isLanguagePath)
    return NextResponse.redirect(
      new URL(`/${language}${request.nextUrl.pathname}${request.nextUrl.search}${request.nextUrl.hash}`, request.url),
    );

  return await updateSession(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
