import type { Session } from '@supabase/supabase-js';
import { SUPABASE_AUTH_TOKEN, WEB_URL } from '../../constants';

export const getUserFromCookie = async () => {
  const cookie = await chrome.cookies.get({
    name: SUPABASE_AUTH_TOKEN,
    url: WEB_URL,
  });
  if (!cookie) return;

  return JSON.parse(cookie.value) as Session;
};
