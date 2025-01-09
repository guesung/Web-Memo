import { PATHS } from '@extension/shared/constants';
import { useMutation } from '@tanstack/react-query';
import useSupabaseClientQuery from './useSupabaseClientQuery';
import { AuthService } from '@src/utils/Supabase';

export default function useSignoutMutation() {
  const { data: supabaseClient } = useSupabaseClientQuery();

  return useMutation({
    mutationFn: new AuthService(supabaseClient).signout,
  });
}
