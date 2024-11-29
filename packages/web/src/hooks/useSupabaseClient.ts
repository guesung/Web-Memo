import { MemoSupabaseClient } from '@extension/shared/types';
import { getSupabaseClient } from '@src/modules/supabase/util.client';
import { useMemo } from 'react';

let client: MemoSupabaseClient | undefined;

function getSupabaseClientBrowser() {
  if (client) return client;
  return getSupabaseClient();
}

function useSupabaseClient() {
  return useMemo(getSupabaseClientBrowser, []);
}

export default useSupabaseClient;
