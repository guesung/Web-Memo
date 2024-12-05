import { SUPABASE } from '@src/constants';
import { CategoryRow, CategoryTable, MemoRow, MemoSupabaseClient, MemoTable } from '@src/types';

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
  #schema = this._supabaseClient.from(SUPABASE.schemaMemo);

  async insertMemo(request: MemoTable['Insert']) {
    return this.#schema.insert(request).select();
  }

  async upsertMemos(request: MemoTable['Insert'][]) {
    return this.#schema.upsert(request).select();
  }

  async getMemos() {
    return this.#schema.select('*,category(name)').order('created_at', { ascending: false });
  }

  async updateMemo(id: MemoRow['id'], request: MemoTable['Update']) {
    return this.#schema.update(request).eq('id', id).select();
  }

  async deleteMemo(id: MemoRow['id']) {
    return this.#schema.delete().eq('id', id).select();
  }

  async deleteMemos(idList: MemoRow['id'][]) {
    return this.#schema.delete().in('id', idList).select();
  }
}

export class CategoryService extends SupabaseService {
  #schema = this._supabaseClient.from(SUPABASE.schemaCategory);

  async insertCategory(request: CategoryTable['Insert']) {
    return this.#schema.insert(request).select();
  }

  async upsertCategories(request: CategoryTable['Insert'][]) {
    return this.#schema.upsert(request).select();
  }

  async getCategories() {
    return this.#schema.select('*').order('created_at', { ascending: false });
  }

  async updateCategory(id: CategoryRow['id'], request: CategoryTable['Update']) {
    return this.#schema.update(request).eq('id', id).select();
  }

  async deleteCategory(id: CategoryRow['id']) {
    return this.#schema.delete().eq('id', id).select();
  }
}

export class AuthService extends SupabaseService {
  #schema = this._supabaseClient.auth;

  getUser() {
    return this.#schema.getUser();
  }

  async checkUserLogin() {
    const user = await this.#schema.getUser();
    return !!user?.data?.user;
  }
}
