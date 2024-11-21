import { NEED_AUTH_PAGES, SUPABASE_ANON_KEY, SUPABASE_URL } from '@src/constants';
import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
    headers: setHeader(request),
  });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // 서버 쿠키 설정
        cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        // 브라우저 쿠키 설정
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
      },
    },
  });

  const user = await supabase.auth.getUser();
  const isUserLogin = !!user?.data?.user;
  const isNeedAuthPage = NEED_AUTH_PAGES.includes(request.nextUrl.pathname);

  if (!isUserLogin && isNeedAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export function setHeader(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('pathname', request.nextUrl.pathname);
  return requestHeaders;
}