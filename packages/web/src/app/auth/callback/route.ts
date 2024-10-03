import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { type CookieOptions, createServerClient } from '@supabase/ssr';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@src/constants';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  try {
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/';

    if (!code) throw new Error('no code');

    const cookieStore = cookies();
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.delete({ name, ...options });
        },
      },
    });

    const { data: sessionData } = await supabase.auth.exchangeCodeForSession(code);

    if (!sessionData.session) throw new Error('no session');

    cookieStore.set('access_token', sessionData.session.access_token);
    cookieStore.set('refresh_token', sessionData.session.refresh_token);

    return NextResponse.redirect(`${origin}${next}`);
  } catch (e) {
    return NextResponse.redirect(`${origin}/login?message=Could not login with provider`);
  }
}
