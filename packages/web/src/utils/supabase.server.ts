import { COOKIE_KEY, SUPABASE } from '@extension/shared/constants';
import { Database, MemoSupabaseClient } from '@extension/shared/types';
import { CONFIG, PATHS, SUPABASE_ANON_KEY } from '@src/constants';
import { createServerClient } from '@supabase/ssr';
import { Provider } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

let supabaseClient: MemoSupabaseClient;

export const getSupabaseClient = () => {
  if (supabaseClient) return supabaseClient;

  const cookieStore = cookies();

  return createServerClient<Database>(CONFIG.supabaseUrl, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      },
    },
    db: { schema: SUPABASE.schemaMemo },
  });
};

export const signInWithOAuth = async (provider: Provider) => {
  'use server';
  const supabaseClient = getSupabaseClient();

  const { error, data } = await supabaseClient.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${CONFIG.webUrl}${PATHS.callbackOAuth}`,
    },
  });

  if (error) redirect('/error');
  revalidatePath(PATHS.root, 'layout');
  redirect(data.url);
};

export const signInWithEmail = async (email: string, password: string) => {
  'use server';
  const supabaseClient = getSupabaseClient();
  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) redirect(PATHS.error);
  revalidatePath(PATHS.root, 'layout');
  redirect(`${CONFIG.webUrl}${PATHS.callbackEmail}`);
};

export const signout = async () => {
  'use server';
  const supabaseClient = getSupabaseClient();
  await supabaseClient.auth.signOut();

  const cookieStore = cookies();
  cookieStore.delete(COOKIE_KEY.accessToken);
  cookieStore.delete(COOKIE_KEY.refreshToken);
  redirect(PATHS.login);
};
