import type { PostgrestSingleResponse, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './supabase';

export type MemoTable = Database['memo']['Tables']['memo'];
export type MemoTableInsert = MemoTable['Insert'];
export type MemoRow = MemoTable['Row'];
export type MemoSupabaseClient = SupabaseClient<Database, 'memo', Database['memo']>;
export type MemoSupabaseResponse = PostgrestSingleResponse<Array<MemoTable['Row']>>;

export type CategoryTable = Database['memo']['Tables']['category'];
export type CategoryTableInsert = CategoryTable['Insert'];
export type CategoryRow = CategoryTable['Row'];
export type CategorySupabaseResponse = PostgrestSingleResponse<Array<CategoryTable['Row']>>;
