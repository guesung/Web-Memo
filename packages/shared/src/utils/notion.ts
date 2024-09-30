import { MAKE_WEBHOOK_NOTION_API } from '@src/constants';
import { getMemoMetaData } from './extension';

export const saveMemoNotion = async (memo: string) => {
  const memoData = await getMemoMetaData(memo);

  const response = await fetch(MAKE_WEBHOOK_NOTION_API, {
    method: 'POST',
    body: JSON.stringify(memoData),
  });
  return response;
};
