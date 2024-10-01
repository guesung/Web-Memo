import { SUPABASE_AUTH_TOKEN, WEB_URL } from '@src/constants';
import type { Session } from '@supabase/supabase-js';

export const getSession = async () => {
  console.log(1);
  console.log(chrome.cookies);
  const cookie = await chrome.cookies.get({
    name: SUPABASE_AUTH_TOKEN,
    url: WEB_URL,
  });
  if (!cookie) return;

  return JSON.parse(cookie.value) as Session;
};

export const removeSession = async () => {
  await chrome.cookies.remove({
    name: SUPABASE_AUTH_TOKEN,
    url: WEB_URL,
  });
};
