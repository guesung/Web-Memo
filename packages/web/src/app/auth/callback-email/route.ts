import { getSupabaseClient } from '@src/utils/supabase.server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { COOKIE_KEY_ACCESS_TOKEN, COOKIE_KEY_REFRESH_TOKEN } from '@extension/shared/constants';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  const supabase = getSupabaseClient();
  const { data: sessionData } = await supabase.auth.getSession();

  if (!sessionData.session) throw new Error('no session');

  const cookieStore = cookies();
  cookieStore.set(COOKIE_KEY_ACCESS_TOKEN, sessionData.session.access_token, {
    maxAge: 3600 * 24 * 365, // 1년
  });
  cookieStore.set(COOKIE_KEY_REFRESH_TOKEN, sessionData.session.refresh_token, {
    maxAge: 3600 * 24 * 365, // 1년
  });

  return NextResponse.redirect(requestUrl.origin + '/memos');
}
