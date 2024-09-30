import { MemoSupabaseClient, MemoTable } from '@src/types';
import { type Provider } from '@supabase/supabase-js';

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
