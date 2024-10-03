import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SUPABASE_ANON_KEY, SUPABASE_URL, WEB_URL } from '@src/constants';

export function createClient() {
  const cookieStore = cookies();

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      },
    },
  });
  return supabase;
}

import { Provider } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const signInWithOAuth = async (provider: Provider) => {
  'use server';
  const supabaseClient = createClient();

  const { error, data } = await supabaseClient.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${WEB_URL}/auth/callback`,
    },
  });

  if (error) redirect('/error');
  revalidatePath('/', 'layout');
  redirect(data.url);
};

export const signInWithOAuthKakao = async () => {
  'use server';
  await signInWithOAuth('kakao');
};
export const signInWithOAuthGoogle = async () => {
  'use server';
  await signInWithOAuth('google');
};
