import { QUERY_KEY } from '@src/constants';
import { AuthService } from '@src/utils';
import { type UserResponse } from '@supabase/supabase-js';
import { useSuspenseQuery } from '@tanstack/react-query';

import useSupabaseQuery from './useSupabaseQuery';

export default function useSupabaseUser() {
  const { data: supabaseClient } = useSupabaseQuery();

  const query = useSuspenseQuery<UserResponse, Error>({
    queryFn: new AuthService(supabaseClient).getUser,
    queryKey: QUERY_KEY.user(),
  });

  return {
    ...query,
    user: query.data,
  };
}
