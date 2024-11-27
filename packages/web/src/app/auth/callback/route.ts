import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { COOKIE_KEY } from '@extension/shared/constants';
import { PATHS } from '@src/constants';
import { getSupabaseClient } from '@src/modules/supabase/util.server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = getSupabaseClient();
    const { data: sessionData } = await supabase.auth.exchangeCodeForSession(code);

    if (!sessionData.session) throw new Error('no session');

    const cookieStore = cookies();
    cookieStore.set(COOKIE_KEY.accessToken, sessionData.session.access_token, {
      maxAge: 3600 * 24 * 365, // 1년
    });
    cookieStore.set(COOKIE_KEY.refreshToken, sessionData.session.refresh_token, {
      maxAge: 3600 * 24 * 365, // 1년
    });
  }

  return NextResponse.redirect(requestUrl.origin + PATHS.memos);
}
