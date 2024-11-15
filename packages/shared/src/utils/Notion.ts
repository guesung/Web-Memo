import { MAKE_WEBHOOK_NOTION_API } from '@src/constants';
import { getFormattedMemo } from './extension';

interface SaveMemoNotionProps {
  memo: string;
  category: string[];
}

export const saveMemoNotion = async ({ memo, category }: SaveMemoNotionProps) => {
  const memoData = await getFormattedMemo({ memo, category });

  const response = await fetch(MAKE_WEBHOOK_NOTION_API, {
    method: 'POST',
    body: JSON.stringify(memoData),
  });
  return response;
};
