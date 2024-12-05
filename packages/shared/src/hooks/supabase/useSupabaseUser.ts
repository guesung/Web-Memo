import { QUERY_KEY } from '@src/constants';
import { MemoSupabaseClient } from '@src/types';
import { AuthService } from '@src/utils';
import { type UserResponse } from '@supabase/supabase-js';
import { useSuspenseQuery } from '@tanstack/react-query';

interface UseSupabaseUserProps {
  supabaseClient: MemoSupabaseClient;
}

export default function useSupabaseUser({ supabaseClient }: UseSupabaseUserProps) {
  const query = useSuspenseQuery<UserResponse, Error>({
    queryFn: () => new AuthService(supabaseClient).getUser(),
    queryKey: QUERY_KEY.user(),
  });

  return {
    ...query,
    user: query.data,
  };
}
