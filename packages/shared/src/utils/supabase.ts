import { MemoSupabaseClient, MemoTable } from '@src/types';
import { type Provider } from '@supabase/supabase-js';
import { getMemoMetaData } from './extension';

export const getMemoSupabase = async (supabaseClient: MemoSupabaseClient) => supabaseClient.from('memo').select('*');

export const insertMemo = async (supabaseClient: MemoSupabaseClient, memoRequest: MemoTable['Insert']) =>
  supabaseClient.from('memo').insert(memoRequest).select();

export const updateMemo = async (supabaseClient: MemoSupabaseClient, memoRequest: MemoTable['Update']) =>
  supabaseClient.from('memo').update(memoRequest).eq('url', memoRequest).select();

export const upsertMemo = async (supabaseClient: MemoSupabaseClient, memoRequest: MemoTable['Insert']) =>
  supabaseClient.from('memo').upsert(memoRequest).select();

export const signInOAuth = async (supabaseClient: MemoSupabaseClient, provider: Provider) =>
  supabaseClient.auth.signInWithOAuth({
    provider,
  });

export const saveMemoSupabase = async (supabaseClient: MemoSupabaseClient, memo: string) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { date, ...memoData } = await getMemoMetaData(memo);
  const { data: memoList } = await getMemoSupabase(supabaseClient);

  const urlMatchMemo = memoList?.find(memo => memo.url === memoData.url);

  if (urlMatchMemo === undefined) await insertMemo(supabaseClient, memoData);
  else await updateMemo(supabaseClient, memoData);
};
