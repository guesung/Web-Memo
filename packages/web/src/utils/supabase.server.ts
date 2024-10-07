import { Database } from '@extension/shared/types';
import { SUPABASE_ANON_KEY, SUPABASE_URL, WEB_URL } from '@src/constants';
import { createServerClient } from '@supabase/ssr';
import { Provider } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const getSupabaseClient = () => {
  const cookieStore = cookies();

  const supabaseClient = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      },
    },
    db: { schema: 'memo' },
  });
  return supabaseClient;
};

export const signInWithOAuth = async (provider: Provider) => {
  'use server';
  const supabaseClient = getSupabaseClient();

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

export const signout = async () => {
  'use server';
  const supabaseClient = getSupabaseClient();
  await supabaseClient.auth.signOut();
  const cookieStore = cookies();
  cookieStore.delete('access_token');
  cookieStore.delete('refresh_token');
};
