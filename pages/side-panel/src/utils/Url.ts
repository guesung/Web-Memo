import { CONFIG, PATHS } from '@extension/shared/constants';
import { SearchParams } from '@extension/shared/modules/search-params';

export const getMemoUrl = (id?: number) => {
  const searchParams = new SearchParams([]);
  if (id) searchParams.set('id', String(id));

  return `${CONFIG.webUrl}/${PATHS.memos}${searchParams.getSearchParams()}`;
};

export const getMemoWishListUrl = (id?: number) => {
  const searchParams = new SearchParams([]);
  searchParams.set('isWish', 'true');
  if (id) searchParams.set('id', String(id));

  return `${CONFIG.webUrl}/${PATHS.memos}?${searchParams.getSearchParams()}`;
};
