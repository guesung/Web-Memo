import type { PostgrestSingleResponse, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database';

export type MemoTable = Database['memo']['Tables']['memo'];
export type MemoSupabaseClient = SupabaseClient<Database, 'memo', Database['memo']>;
export type MemoSupabaseResponse = PostgrestSingleResponse<Array<MemoTable['Row']>>;
