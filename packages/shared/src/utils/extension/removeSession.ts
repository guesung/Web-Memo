import { SUPABASE_AUTH_TOKEN, WEB_URL } from '../../constants';

export const removeSession = async () => {
  await chrome.cookies.remove({
    name: SUPABASE_AUTH_TOKEN,
    url: WEB_URL,
  });
};
