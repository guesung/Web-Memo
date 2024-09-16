import type { UserResponse } from '@supabase/supabase-js';
import { authToken } from 'lib/constants';

export const getUser = async () => {
  const cookie = await chrome.cookies.get({
    name: authToken,
    url: 'http://localhost:3000',
  });
  if (!cookie) return;

  return JSON.parse(cookie.value) as UserResponse;
};
