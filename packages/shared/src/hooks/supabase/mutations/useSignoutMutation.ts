import { useMutation } from '@tanstack/react-query';
import { useSupabaseClientQuery } from '../queries';
import { AuthService } from '@src/utils/Supabase';

export default function useSignoutMutation() {
  const { data: supabaseClient } = useSupabaseClientQuery();

  return useMutation({
    mutationFn: new AuthService(supabaseClient).signout,
  });
}
