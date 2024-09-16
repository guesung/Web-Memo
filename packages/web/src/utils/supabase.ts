import { createClient } from '@supabase/supabase-js';

const getSupabaseClient = () => {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
};

const supabaseClient = getSupabaseClient();
export { supabaseClient };
