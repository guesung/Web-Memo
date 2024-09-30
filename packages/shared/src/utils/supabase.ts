import { MemoTable } from '@src/types';
import { type Provider, SupabaseClient } from '@supabase/supabase-js';

export const getMemoSupabase = async (supabaseClient: SupabaseClient) => supabaseClient.from('memo').select('*');

export const insertMemo = async (supabaseClient: SupabaseClient, memoRequest: MemoTable['Insert']) =>
  supabaseClient.from('memo').insert(memoRequest).select();

export const updateMemo = async (supabaseClient: SupabaseClient, memoRequest: MemoTable['Update']) =>
  supabaseClient.from('memo').update(memoRequest).eq('url', memoRequest).select();

export const upsertMemo = async (supabaseClient: SupabaseClient, memoRequest: MemoTable['Insert']) =>
  supabaseClient.from('memo').upsert(memoRequest).select();

export const signInOAuth = async (supabaseClient: SupabaseClient, provider: Provider) =>
  supabaseClient.auth.signInWithOAuth({
    provider,
  });
