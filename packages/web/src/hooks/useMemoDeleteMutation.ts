import { deleteMemo } from '@extension/shared/utils';
import { getSupabaseClient } from '@src/utils/supabase.client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function useMemoDeleteMutation() {
  const queryClient = useQueryClient();

  const deleteMemoFn = async (id: number) => {
    const supabaseClient = getSupabaseClient();
    await deleteMemo(supabaseClient, id);
  };

  return useMutation({
    mutationFn: deleteMemoFn,
    onSettled: async () => {
      queryClient.invalidateQueries({ queryKey: ['memo-list'] });
    },
  });
}
