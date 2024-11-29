import { CONFIG } from '@src/constants';

import { getFormattedMemo } from './extension';

interface SaveMemoNotionProps {
  memo: string;
  category: string;
}

export const saveMemoNotion = async ({ memo }: SaveMemoNotionProps) => {
  const memoData = await getFormattedMemo({ memo });

  const response = await fetch(CONFIG.makeWebhookNotionApi, {
    method: 'POST',
    body: JSON.stringify(memoData),
  });
  return response;
};
