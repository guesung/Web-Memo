import { QUERY_KEY } from '@extension/shared/constants';
import { deleteMemo } from '@extension/shared/utils';
import { getSupabaseClient } from '@src/utils/supabase.client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface UseMemoDeleteMutationProps {
  handleSuccess?: () => void;
}

export default function useMemoDeleteMutation({ handleSuccess }: UseMemoDeleteMutationProps) {
  const queryClient = useQueryClient();

  const deleteMemoFn = async (id: number) => {
    const supabaseClient = getSupabaseClient();
    await deleteMemo(supabaseClient, id);
  };

  return useMutation({
    mutationFn: deleteMemoFn,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY.memos() });
      handleSuccess?.();
    },
  });
}
