import { queryKeys } from '@src/constants';
import { MemoSupabaseClient } from '@src/types';
import { type UserResponse } from '@supabase/supabase-js';
import { useSuspenseQuery } from '@tanstack/react-query';

interface UseSupabaseUserProps {
  supabaseClient: MemoSupabaseClient;
}

export default function useSupabaseUser({ supabaseClient }: UseSupabaseUserProps) {
  const getUser = async () => {
    return await supabaseClient.auth.getUser();
  };

  return useSuspenseQuery<UserResponse, Error>({
    queryFn: getUser,
    queryKey: queryKeys.user(),
  });
}
