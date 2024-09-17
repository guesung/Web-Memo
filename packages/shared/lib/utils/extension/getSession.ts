import type { Session } from '@supabase/supabase-js';
import { authToken, WEB_URL } from '../../constants';

export const getUserFromCookie = async () => {
  const cookie = await chrome.cookies.get({
    name: authToken,
    url: WEB_URL,
  });
  if (!cookie) return;

  return JSON.parse(cookie.value) as Session;
};
