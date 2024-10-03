'use server';
import { WEB_URL } from '@src/constants';
import { createClient } from '@src/utils/supabase-server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function login() {
  const supabase = createClient();

  const { error, data } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${WEB_URL}/auth/callback`,
    },
  });

  if (error) {
    redirect('/error');
  }

  revalidatePath('/', 'layout');
  redirect(data.url);
}
