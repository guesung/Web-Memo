import { MemoType } from '../../types';
import { formatDate } from '../date';
import { MemoStorage } from './module';
import type { Session } from '@supabase/supabase-js';
import { SUPABASE_AUTH_TOKEN, WEB_URL } from '../../constants';

export const getMemoList = async (): Promise<MemoType[]> => {
  const memoStorage = await MemoStorage.get();
  const memoList = Object.values(memoStorage)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map(({ date, ...memo }) => ({
      date: formatDate(date),
      ...memo,
    }));
  return memoList;
};

export const getSession = async () => {
  const cookie = await chrome.cookies.get({
    name: SUPABASE_AUTH_TOKEN,
    url: WEB_URL,
  });
  if (!cookie) return;

  return JSON.parse(cookie.value) as Session;
};
