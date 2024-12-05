import { SUPABASE } from '@src/constants';
import { CategoryRow, CategoryTable, MemoRow, MemoSupabaseClient, MemoTable } from '@src/types';
import type { QueryData } from '@supabase/supabase-js';

export class MemoService {
  #supabaseClient: MemoSupabaseClient;

  constructor(supabaseClient: MemoSupabaseClient) {
    this.#supabaseClient = supabaseClient;
  }

  async getMemos() {
    return this.#supabaseClient
      .from(SUPABASE.schemaMemo)
      .select('*,category(name)')
      .order('created_at', { ascending: false });
  }

  async insertMemo(memoRequest: MemoTable['Insert']) {
    return this.#supabaseClient.from(SUPABASE.schemaMemo).insert(memoRequest).select();
  }

  async updateMemo(id: MemoRow['id'], memoRequest: MemoTable['Update']) {
    return this.#supabaseClient.from(SUPABASE.schemaMemo).update(memoRequest).eq('id', id).select();
  }

  async deleteMemo(id: number) {
    return this.#supabaseClient.from(SUPABASE.schemaMemo).delete().eq('id', id).select();
  }

  async deleteMemos(idList: number[]) {
    return this.#supabaseClient.from(SUPABASE.schemaMemo).delete().in('id', idList).select();
  }

  async upsertMemos(memoRequest: MemoTable['Insert'][]) {
    return this.#supabaseClient.from(SUPABASE.schemaMemo).upsert(memoRequest).select();
  }
}

export class CategoryService {
  #supabaseClient: MemoSupabaseClient;

  constructor(supabaseClient: MemoSupabaseClient) {
    this.#supabaseClient = supabaseClient;
  }

  async getCategories() {
    return this.#supabaseClient.from(SUPABASE.schemaCategory).select('*').order('created_at', { ascending: false });
  }

  async insertCategory(categoryRequest: CategoryTable['Insert']) {
    return this.#supabaseClient.from(SUPABASE.schemaCategory).insert(categoryRequest).select();
  }

  async updateCategory(id: CategoryRow['id'], categoryRequest: CategoryTable['Update']) {
    return this.#supabaseClient.from(SUPABASE.schemaCategory).update(categoryRequest).eq('id', id).select();
  }

  async deleteCategory(id: CategoryRow['id']) {
    return this.#supabaseClient.from(SUPABASE.schemaCategory).delete().eq('id', id).select();
  }

  async upsertCategories(categoryRequest: CategoryTable['Insert'][]) {
    return this.#supabaseClient.from(SUPABASE.schemaCategory).upsert(categoryRequest).select();
  }
}

export class AuthService {
  #supabaseClient: MemoSupabaseClient;

  constructor(supabaseClient: MemoSupabaseClient) {
    this.#supabaseClient = supabaseClient;
  }

  getUser() {
    return this.#supabaseClient.auth.getUser();
  }

  async checkUserLogin() {
    const user = await this.#supabaseClient.auth.getUser();
    return !!user?.data?.user;
  }
}

// GetMemoResponse 타입은 여전히 필요할 수 있으므로 유지
export type GetMemoResponse = QueryData<ReturnType<MemoService['getMemos']>>[number];
