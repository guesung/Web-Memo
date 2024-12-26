import { PATHS } from '@extension/shared/constants';
import { NextRequest, NextResponse } from 'next/server';

import { getLanguage, languages } from './modules/i18n';
import { updateSession } from './modules/supabase';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // locale
  const isLanguagePath = languages.some(lng => pathname.startsWith(`/${lng}`));
  const isAuthPath = pathname.startsWith(PATHS.auth);

  const language = getLanguage(request);

  if (!isLanguagePath && !isAuthPath)
    return NextResponse.redirect(
      new URL(`/${language}${pathname}${request.nextUrl.search}${request.nextUrl.hash}`, request.url),
    );

  return await updateSession(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
