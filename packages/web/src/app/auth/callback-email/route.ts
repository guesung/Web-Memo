import { getSupabaseClient } from '@src/modules/supabase/util.server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { COOKIE_KEY } from '@extension/shared/constants';
import { PATHS } from '@src/constants';
import { isProduction } from '@src/utils';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  const supabase = getSupabaseClient();
  const { data: sessionData } = await supabase.auth.getSession();

  if (!sessionData.session) throw new Error('no session');

  const cookieStore = cookies();
  cookieStore.set(COOKIE_KEY.accessToken, sessionData.session.access_token, {
    maxAge: 3600 * 24 * 365, // 1년
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  });
  cookieStore.set(COOKIE_KEY.sideBarState, sessionData.session.refresh_token, {
    maxAge: 3600 * 24 * 365, // 1년
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  });

  return NextResponse.redirect(requestUrl.origin + PATHS.memos);
}
