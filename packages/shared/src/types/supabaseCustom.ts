import { MemoService } from '@src/utils';
import type { PostgrestSingleResponse, QueryData, SupabaseClient } from '@supabase/supabase-js';

import { Database } from './supabase';

export type MemoSupabaseClient = SupabaseClient<Database, 'memo', Database['memo']>;

export type MemoTable = Database['memo']['Tables']['memo'];
export type MemoRow = MemoTable['Row'];
export type MemoSupabaseResponse = PostgrestSingleResponse<Array<MemoTable['Row']>>;

export type CategoryTable = Database['memo']['Tables']['category'];
export type CategoryRow = CategoryTable['Row'];
export type CategorySupabaseResponse = PostgrestSingleResponse<Array<CategoryTable['Row']>>;

export type GetMemoResponse = QueryData<ReturnType<MemoService['getMemos']>>[number];
