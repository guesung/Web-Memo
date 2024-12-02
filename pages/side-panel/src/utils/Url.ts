import { CONFIG, PATHS } from '@extension/shared/constants';
import { SearchParams } from '@extension/shared/modules/search-params';
import { MemoRow } from '@extension/shared/types';

export const getMemoUrl = (memo?: MemoRow) => {
  const searchParams = new SearchParams([]);
  if (memo?.id) searchParams.set('id', String(memo.id));
  if (memo?.isWish) searchParams.set('isWish', 'true');

  return `${CONFIG.webUrl}/${PATHS.memos}${searchParams.getSearchParams()}`;
};

export const getMemoWishListUrl = (id?: number) => {
  const searchParams = new SearchParams([]);
  searchParams.set('isWish', 'true');
  if (id) searchParams.set('id', String(id));

  return `${CONFIG.webUrl}/${PATHS.memos}?${searchParams.getSearchParams()}`;
};
