import { QUERY_KEY } from '@extension/shared/constants';
import { MemoSupabaseResponse } from '@extension/shared/types';
import { deleteMemo } from '@extension/shared/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import useSupabaseClient from './useSupabaseClient';

interface UseMemoDeleteMutationProps {
  handleSuccess?: () => void;
}

export default function useMemoDeleteMutation({ handleSuccess }: UseMemoDeleteMutationProps) {
  const queryClient = useQueryClient();
  const supabaseClient = useSupabaseClient;
  useSupabaseClient();

  const deleteMemoFn = async (id: number) => {
    return await deleteMemo(supabaseClient, id);
  };

  return useMutation<MemoSupabaseResponse, Error, number>({
    mutationFn: deleteMemoFn,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY.memos() });
      handleSuccess?.();
    },
  });
}
