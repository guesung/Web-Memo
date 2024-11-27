import { checkUserLogin } from '@extension/shared/utils';
import { CONFIG, NEED_AUTH_PAGES, PATHS } from '@src/constants';
import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function updateSession(request: NextRequest) {
  const nextResponse = NextResponse.next({
    request,
    headers: request.headers,
  });

  const supabaseClient = createServerClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) => nextResponse.cookies.set(name, value, options));
      },
    },
  });

  const isUserLogin = await checkUserLogin(supabaseClient);
  const isNeedAuthPage = NEED_AUTH_PAGES.includes(request.nextUrl.pathname);

  if (!isUserLogin && isNeedAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = PATHS.login;
    return NextResponse.redirect(url);
  }

  return nextResponse;
}
