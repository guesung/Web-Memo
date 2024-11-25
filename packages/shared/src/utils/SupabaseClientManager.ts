import { SUPABASE_ANON_KEY, SUPABASE_SCHEMA_MEMO, SUPABASE_URL } from '@src/constants';
import { Database, MemoSupabaseClient } from '@src/types';
import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { getSupabaseClient as getSupabaseClientExtension } from './extension';

type Environment = 'browser' | 'server' | 'extension';

export class SupabaseClientManager {
  static #instance: SupabaseClientManager;
  #clientInstance: MemoSupabaseClient | null = null;
  #initializationPromise: Promise<MemoSupabaseClient> | null = null;

  static getInstance(): SupabaseClientManager {
    if (!SupabaseClientManager.#instance) SupabaseClientManager.#instance = new SupabaseClientManager();

    return SupabaseClientManager.#instance;
  }

  #detectEnvironment(): Environment {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) return 'extension';
    if (typeof window === 'undefined') return 'server';
    return 'browser';
  }

  async getClient(): Promise<MemoSupabaseClient> {
    if (this.#clientInstance) return this.#clientInstance;

    if (this.#initializationPromise) return this.#initializationPromise;

    this.#initializationPromise = (async () => {
      const environment = this.#detectEnvironment();

      switch (environment) {
        case 'extension': {
          this.#clientInstance = await getSupabaseClientExtension();
          break;
        }

        case 'browser': {
          this.#clientInstance = createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
              storage: {
                getItem: key => {
                  return document.cookie.match(new RegExp(`(^| )${key}=([^;]+)`))?.[2] ?? '';
                },
                setItem: (key, value) => {
                  document.cookie = `${key}=${value}; path=/; max-age=31536000; SameSite=Strict; Secure`;
                },
                removeItem: key => {
                  document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
                },
              },
            },
            db: { schema: SUPABASE_SCHEMA_MEMO },
          });
          break;
        }

        case 'server': {
          // @ts-expect-error: dd
          const { cookies } = await import('next/headers');
          const cookieStore = cookies();

          this.#clientInstance = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
            cookies: {
              getAll() {
                return cookieStore.getAll();
              },
              setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
              },
            },
            db: { schema: SUPABASE_SCHEMA_MEMO },
          });
          break;
        }
      }
      return this.#clientInstance;
    })();
    return this.#initializationPromise;
  }

  clearInstance(): void {
    this.#clientInstance = null;
    this.#initializationPromise = null;
  }
}

export const getSupabaseClient = async (): Promise<MemoSupabaseClient> => {
  const manager = SupabaseClientManager.getInstance();
  const client = await manager.getClient();
  return client;
};
