import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from './utils';
import acceptLanguage from 'accept-language';
import { fallbackLng, languages, cookieName } from './constants';

acceptLanguage.languages(languages);

let locales = ['en', 'ko'];

const getLocale = (request: NextRequest) => 'ko';

export async function middleware(request: NextRequest) {
  let lng;
  if (request.cookies.has(cookieName)) lng = acceptLanguage.get(request.cookies.get(cookieName)?.value);
  if (!lng) lng = acceptLanguage.get(request.headers.get('Accept-Language'));
  if (!lng) lng = fallbackLng;

  if (
    !languages.some(language => request.nextUrl.pathname.startsWith(`/${language}`)) &&
    !request.nextUrl.pathname.startsWith('/_next')
  ) {
    return NextResponse.redirect(new URL(`/${lng}${request.nextUrl.pathname}`, request.url));
  }

  if (request.headers.has('referer')) {
    const refererUrl = new URL(request.headers.get('referer') ?? '');
    const lngInReferer = languages.find(l => refererUrl.pathname.startsWith(`/${l}`));
    const response = NextResponse.next();
    if (lngInReferer) response.cookies.set(cookieName, lngInReferer);
    return response;
  }

  await updateSession(request);

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
