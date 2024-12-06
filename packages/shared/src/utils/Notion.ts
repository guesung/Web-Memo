import { CONFIG } from '@src/constants';

import { getMemoInfo } from './extension';

export const saveMemoNotion = async () => {
  const memoData = await getMemoInfo();

  const response = await fetch(CONFIG.makeWebhookNotionApi, {
    method: 'POST',
    body: JSON.stringify(memoData),
  });
  return response;
};
