import { SUPABASE_SCHEMA_MEMO } from '@src/constants';
import { CategoryTable, MemoRow, MemoSupabaseClient, MemoTable } from '@src/types';
import type { QueryData } from '@supabase/supabase-js';

export const getMemo = async (supabaseClient: MemoSupabaseClient) =>
  supabaseClient.from(SUPABASE_SCHEMA_MEMO).select('*,category(name)').order('created_at', { ascending: false });

export type GetMemoType = QueryData<ReturnType<typeof getMemo>>[number];

export const insertMemo = async (supabaseClient: MemoSupabaseClient, memoRequest: MemoTable['Insert']) =>
  supabaseClient.from(SUPABASE_SCHEMA_MEMO).insert(memoRequest).select();

export const updateMemo = async (
  supabaseClient: MemoSupabaseClient,
  id: MemoRow['id'],
  memoRequest: MemoTable['Update'],
) => supabaseClient.from(SUPABASE_SCHEMA_MEMO).update(memoRequest).eq('id', id).select();

export const deleteMemo = async (supabaseClient: MemoSupabaseClient, id: number) =>
  supabaseClient.from(SUPABASE_SCHEMA_MEMO).delete().eq('id', id).select();

export const upsertMemo = async (supabaseClient: MemoSupabaseClient, memoRequest: MemoTable['Insert']) =>
  supabaseClient.from(SUPABASE_SCHEMA_MEMO).upsert(memoRequest).select();

export const getUser = async (supabaseClient: MemoSupabaseClient) => await supabaseClient.auth.getUser();

export const checkUserLogin = async (supabaseClient: MemoSupabaseClient) => {
  const user = await supabaseClient.auth.getUser();
  return !!user?.data?.user;
};

export const getCategory = async (supabaseClient: MemoSupabaseClient) =>
  supabaseClient.from('category').select('*').order('created_at', { ascending: false });

export const insertCategory = async (supabaseClient: MemoSupabaseClient, categoryRequest: CategoryTable['Insert']) =>
  supabaseClient.from('category').insert(categoryRequest).select();
