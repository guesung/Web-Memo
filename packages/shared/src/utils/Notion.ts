import { MAKE_WEBHOOK_NOTION_API } from '@src/constants';
import { getFormattedMemo } from './extension';

interface SaveMemoNotionProps {
  memo: string;
  category: string;
}

export const saveMemoNotion = async ({ memo }: SaveMemoNotionProps) => {
  const memoData = await getFormattedMemo({ memo });

  const response = await fetch(MAKE_WEBHOOK_NOTION_API, {
    method: 'POST',
    body: JSON.stringify(memoData),
  });
  return response;
};
