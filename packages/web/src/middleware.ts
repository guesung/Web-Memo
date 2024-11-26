import { NextRequest, NextResponse } from 'next/server';
import acceptLanguage from 'accept-language';
import { fallbackLng, languages, cookieName, Language, getLanguage } from './modules/i18n';
import { PATHS } from './constants';
import { updateSession } from './modules/supabase';

export async function middleware(request: NextRequest) {
  const language = getLanguage(request);

  const isLanguagePath = languages.some(lng => request.nextUrl.pathname.startsWith(`/${lng}`));
  const isAuthPath = request.nextUrl.pathname.startsWith(PATHS.auth);
  if (!isLanguagePath && !isAuthPath)
    return NextResponse.redirect(
      new URL(`/${language}${request.nextUrl.pathname}${request.nextUrl.search}${request.nextUrl.hash}`, request.url),
    );

  return await updateSession(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
