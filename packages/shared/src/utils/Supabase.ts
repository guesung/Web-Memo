import { CategoryTable, MemoSupabaseClient, MemoTable } from '@src/types';
import type { QueryData, Provider } from '@supabase/supabase-js';

export const getMemo = async (supabaseClient: MemoSupabaseClient) =>
  supabaseClient.from('memo').select('*,category(name)').order('created_at', { ascending: false });

export type GetMemoType = QueryData<ReturnType<typeof getMemo>>[number];

export const insertMemo = async (supabaseClient: MemoSupabaseClient, memoRequest: MemoTable['Insert']) =>
  supabaseClient.from('memo').insert(memoRequest).select();

export interface UpdateMemoProps extends Omit<MemoTable['Update'], 'id'> {
  id: number;
}
export const updateMemo = async (supabaseClient: MemoSupabaseClient, memoRequest: UpdateMemoProps) =>
  supabaseClient.from('memo').update(memoRequest).eq('id', memoRequest.id).select();

export const deleteMemo = async (supabaseClient: MemoSupabaseClient, id: number) =>
  supabaseClient.from('memo').delete().eq('id', id).select();

export const upsertMemo = async (supabaseClient: MemoSupabaseClient, memoRequest: MemoTable['Insert']) =>
  supabaseClient.from('memo').upsert(memoRequest).select();

export const signInOAuth = async (supabaseClient: MemoSupabaseClient, provider: Provider) =>
  supabaseClient.auth.signInWithOAuth({
    provider,
    options: {
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

export const getUser = async (supabaseClient: MemoSupabaseClient) => await supabaseClient?.auth?.getUser();

export const getCategory = async (supabaseClient: MemoSupabaseClient) =>
  supabaseClient.from('category').select('*').order('created_at', { ascending: false });

export const insertCategory = async (supabaseClient: MemoSupabaseClient, categoryRequest: CategoryTable['Insert']) =>
  supabaseClient.from('category').insert(categoryRequest).select();
