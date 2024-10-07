import { getSupabaseClient } from '@src/utils/supabase.server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = getSupabaseClient();
    const { data: sessionData } = await supabase.auth.exchangeCodeForSession(code);

    if (!sessionData.session) throw new Error('no session');

    const cookieStore = cookies();
    cookieStore.set('access_token', sessionData.session.access_token);
    cookieStore.set('refresh_token', sessionData.session.refresh_token);
  }

  return NextResponse.redirect(requestUrl.origin + '/guide');
}
