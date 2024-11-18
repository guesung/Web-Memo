import { CategoryTable, MemoRow, MemoSupabaseClient, MemoTable } from '@src/types';
import type { QueryData, Provider } from '@supabase/supabase-js';

export const getMemo = async (supabaseClient: MemoSupabaseClient) =>
  supabaseClient.from('memo').select('*,category(name)').order('created_at', { ascending: false });

export type GetMemoType = QueryData<ReturnType<typeof getMemo>>[number];

export const insertMemo = async (supabaseClient: MemoSupabaseClient, memoRequest: MemoTable['Insert']) =>
  supabaseClient.from('memo').insert(memoRequest).select();

export const updateMemo = async (
  supabaseClient: MemoSupabaseClient,
  id: MemoRow['id'],
  memoRequest: MemoTable['Update'],
) => supabaseClient.from('memo').update(memoRequest).eq('id', id).select();

export const deleteMemo = async (supabaseClient: MemoSupabaseClient, id: number) =>
  supabaseClient.from('memo').delete().eq('id', id);

export const upsertMemo = async (supabaseClient: MemoSupabaseClient, memoRequest: MemoTable['Insert']) =>
  supabaseClient.from('memo').upsert(memoRequest).select();

export const signInOAuth = async (supabaseClient: MemoSupabaseClient, provider: Provider) =>
  supabaseClient.auth.signInWithOAuth({
    provider,
  });

export const getUser = async (supabaseClient: MemoSupabaseClient) => await supabaseClient.auth.getUser();

export const getCategory = async (supabaseClient: MemoSupabaseClient) =>
  supabaseClient.from('category').select('*').order('created_at', { ascending: false });

export const insertCategory = async (supabaseClient: MemoSupabaseClient, categoryRequest: CategoryTable['Insert']) =>
  supabaseClient.from('category').insert(categoryRequest).select();
