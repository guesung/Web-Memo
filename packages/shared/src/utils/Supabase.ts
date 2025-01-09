import { COOKIE_KEY, SUPABASE } from '@src/constants';
import { CategoryRow, CategoryTable, MemoRow, MemoSupabaseClient, MemoTable } from '@src/types';

export class MemoService {
  supabaseClient: MemoSupabaseClient;

  constructor(supabaseClient: MemoSupabaseClient) {
    this.supabaseClient = supabaseClient;
  }

  insertMemo = async (request: MemoTable['Insert']) =>
    this.supabaseClient.from(SUPABASE.table.memo).insert(request).select();

  upsertMemos = async (request: MemoTable['Insert'][]) =>
    this.supabaseClient.from(SUPABASE.table.memo).upsert(request).select();

  getMemos = async () =>
    this.supabaseClient.from(SUPABASE.table.memo).select('*,category(name)').order('created_at', { ascending: false });

  updateMemo = async ({ id, request }: { id: MemoRow['id']; request: MemoTable['Update'] }) =>
    this.supabaseClient.from(SUPABASE.table.memo).update(request).eq('id', id).select();

  deleteMemo = async (id: MemoRow['id']) =>
    this.supabaseClient.from(SUPABASE.table.memo).delete().eq('id', id).select();

  deleteMemos = async (idList: MemoRow['id'][]) =>
    this.supabaseClient.from(SUPABASE.table.memo).delete().in('id', idList).select();
}

export class CategoryService {
  supabaseClient: MemoSupabaseClient;

  constructor(supabaseClient: MemoSupabaseClient) {
    this.supabaseClient = supabaseClient;
  }

  insertCategory = async (request: CategoryTable['Insert']) =>
    this.supabaseClient.from(SUPABASE.table.category).insert(request).select();

  upsertCategories = async (request: CategoryTable['Insert'][]) =>
    this.supabaseClient.from(SUPABASE.table.category).upsert(request).select();

  getCategories = async () =>
    this.supabaseClient.from(SUPABASE.table.category).select('*').order('created_at', { ascending: false });

  updateCategory = async ({ id, request }: { id: CategoryRow['id']; request: CategoryTable['Update'] }) =>
    this.supabaseClient.from(SUPABASE.table.category).update(request).eq('id', id).select();

  deleteCategory = async (id: CategoryRow['id']) =>
    this.supabaseClient.from(SUPABASE.table.category).delete().eq('id', id).select();
}

export class AuthService {
  supabaseClient: MemoSupabaseClient;

  constructor(supabaseClient: MemoSupabaseClient) {
    this.supabaseClient = supabaseClient;
  }

  getUser = () => this.supabaseClient.auth.getUser();

  checkUserLogin = async () => {
    const user = await this.supabaseClient.auth.getUser();
    return !!user?.data?.user;
  };

  signout = () => this.supabaseClient.auth.signOut();
}
