import { WEB_URL } from '@extension/shared/constants';

export const getWishListUrl = (id?: number) => {
  if (id) return `${WEB_URL}/memos?wish=true&id=${id}`;
  return `${WEB_URL}/memos?wish=true`;
};
