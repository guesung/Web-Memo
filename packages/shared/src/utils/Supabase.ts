import { SUPABASE } from '@src/constants';
import { CategoryRow, CategoryTable, MemoRow, MemoSupabaseClient, MemoTable } from '@src/types';
import type { QueryData } from '@supabase/supabase-js';

export class SupabaseService {
  _supabaseClient: MemoSupabaseClient;

  constructor(supabaseClient: MemoSupabaseClient) {
    this.#validateSupabaseClient(supabaseClient);

    this._supabaseClient = supabaseClient;
  }

  #validateSupabaseClient(supabaseClient: MemoSupabaseClient) {
    if (!supabaseClient) throw new Error('Supabase client가 정의되지 않았습니다.');
  }
}

export class MemoService extends SupabaseService {
  async getMemos() {
    return this._supabaseClient
      .from(SUPABASE.schemaMemo)
      .select('*,category(name)')
      .order('created_at', { ascending: false });
  }

  async insertMemo(memoRequest: MemoTable['Insert']) {
    return this._supabaseClient.from(SUPABASE.schemaMemo).insert(memoRequest).select();
  }

  async updateMemo(id: MemoRow['id'], memoRequest: MemoTable['Update']) {
    return this._supabaseClient.from(SUPABASE.schemaMemo).update(memoRequest).eq('id', id).select();
  }

  async deleteMemo(id: number) {
    return this._supabaseClient.from(SUPABASE.schemaMemo).delete().eq('id', id).select();
  }

  async deleteMemos(idList: number[]) {
    return this._supabaseClient.from(SUPABASE.schemaMemo).delete().in('id', idList).select();
  }

  async upsertMemos(memoRequest: MemoTable['Insert'][]) {
    return this._supabaseClient.from(SUPABASE.schemaMemo).upsert(memoRequest).select();
  }
}

export class CategoryService extends SupabaseService {
  async getCategories() {
    return this._supabaseClient.from(SUPABASE.schemaCategory).select('*').order('created_at', { ascending: false });
  }

  async insertCategory(categoryRequest: CategoryTable['Insert']) {
    return this._supabaseClient.from(SUPABASE.schemaCategory).insert(categoryRequest).select();
  }

  async updateCategory(id: CategoryRow['id'], categoryRequest: CategoryTable['Update']) {
    return this._supabaseClient.from(SUPABASE.schemaCategory).update(categoryRequest).eq('id', id).select();
  }

  async deleteCategory(id: CategoryRow['id']) {
    return this._supabaseClient.from(SUPABASE.schemaCategory).delete().eq('id', id).select();
  }

  async upsertCategories(categoryRequest: CategoryTable['Insert'][]) {
    return this._supabaseClient.from(SUPABASE.schemaCategory).upsert(categoryRequest).select();
  }
}

export class AuthService extends SupabaseService {
  getUser() {
    return this._supabaseClient.auth.getUser();
  }

  async checkUserLogin() {
    const user = await this._supabaseClient.auth.getUser();
    return !!user?.data?.user;
  }
}

// GetMemoResponse 타입은 여전히 필요할 수 있으므로 유지
export type GetMemoResponse = QueryData<ReturnType<MemoService['getMemos']>>[number];
