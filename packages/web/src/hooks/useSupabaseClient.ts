import { getSupabaseClient } from '@src/modules/supabase/util.client';
import { useMemo } from 'react';

export default function useSupabaseClient() {
  return useMemo(getSupabaseClient, []);
}
