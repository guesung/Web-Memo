import { MemoSupabaseClient, MemoTable } from '@src/types';
import { type Provider } from '@supabase/supabase-js';

export const getMemoSupabase = async (supabaseClient: MemoSupabaseClient) =>
  supabaseClient.from('memo').select('*').order('created_at', { ascending: false });

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
