import { FeedbackService } from '@src/utils';
import { useMutation } from '@tanstack/react-query';

import useSupabaseFeedbackClientQuery from './useSupabaseFeedbackClientQuery';

export default function useFeedbackMutation() {
  const { data: supabaseClient } = useSupabaseFeedbackClientQuery();

  return useMutation({
    mutationFn: new FeedbackService(supabaseClient).insertFeedback,
  });
}
