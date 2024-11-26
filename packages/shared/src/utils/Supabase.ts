import { SUPABASE } from '@src/constants';
import { CategoryTable, MemoRow, MemoSupabaseClient, MemoTable } from '@src/types';
import type { QueryData } from '@supabase/supabase-js';

export const getMemos = async (supabaseClient: MemoSupabaseClient) =>
  supabaseClient.from(SUPABASE.schemaMemo).select('*,category(name)').order('created_at', { ascending: false });

export type GetMemoResponse = QueryData<ReturnType<typeof getMemos>>[number];

export const insertMemo = async (supabaseClient: MemoSupabaseClient, memoRequest: MemoTable['Insert']) =>
  supabaseClient.from(SUPABASE.schemaMemo).insert(memoRequest).select();

export const updateMemo = async (
  supabaseClient: MemoSupabaseClient,
  id: MemoRow['id'],
  memoRequest: MemoTable['Update'],
) => supabaseClient.from(SUPABASE.schemaMemo).update(memoRequest).eq('id', id).select();

export const deleteMemo = async (supabaseClient: MemoSupabaseClient, id: number) =>
  supabaseClient.from(SUPABASE.schemaMemo).delete().eq('id', id).select();

export const upsertMemo = async (supabaseClient: MemoSupabaseClient, memoRequest: MemoTable['Insert']) =>
  supabaseClient.from(SUPABASE.schemaMemo).upsert(memoRequest).select();

export const getUser = async (supabaseClient: MemoSupabaseClient) => await supabaseClient.auth.getUser();

export const checkUserLogin = async (supabaseClient: MemoSupabaseClient) => {
  const user = await supabaseClient.auth.getUser();
  return !!user?.data?.user;
};

export const getCategories = async (supabaseClient: MemoSupabaseClient) =>
  supabaseClient.from('category').select('*').order('created_at', { ascending: false });

export const insertCategory = async (supabaseClient: MemoSupabaseClient, categoryRequest: CategoryTable['Insert']) =>
  supabaseClient.from('category').insert(categoryRequest).select();
