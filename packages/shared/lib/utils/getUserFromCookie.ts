import type { UserResponse } from '@supabase/supabase-js';
import { authToken } from '../constants';

export const getUserFromCookie = async () => {
  const cookie = await chrome.cookies.get({
    name: authToken,
    url: process.env.WEB_URL!,
  });
  if (!cookie) return;

  return JSON.parse(cookie.value) as UserResponse;
};
