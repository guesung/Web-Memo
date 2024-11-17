import type { PostgrestSingleResponse, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './supabase';

export type MemoTable = Database['memo']['Tables']['memo'];
export type MemoTableInsert = Database['memo']['Tables']['memo']['Insert'];
export type MemoRow = Database['memo']['Tables']['memo']['Row'];
export type MemoSupabaseClient = SupabaseClient<Database, 'memo', Database['memo']>;
export type MemoSupabaseResponse = PostgrestSingleResponse<Array<MemoTable['Row']>>;

export type CategoryRow = Database['memo']['Tables']['category']['Row'];
