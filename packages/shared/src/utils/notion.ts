import { MAKE_WEBHOOK_NOTION_API } from '@src/constants';
import { getFormattedMemo } from './extension';

export const saveMemoNotion = async (memo: string) => {
  const memoData = await getFormattedMemo(memo);

  const response = await fetch(MAKE_WEBHOOK_NOTION_API, {
    method: 'POST',
    body: JSON.stringify(memoData),
  });
  return response;
};
