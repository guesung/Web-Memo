import { AuthService } from '@src/utils/Supabase';
import { useMutation } from '@tanstack/react-query';

import { useSupabaseClientQuery } from '../queries';

export default function useSignoutMutation() {
  const { data: supabaseClient } = useSupabaseClientQuery();

  return useMutation({
    mutationFn: new AuthService(supabaseClient).signout,
  });
}
