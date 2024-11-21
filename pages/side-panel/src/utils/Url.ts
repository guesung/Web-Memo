import { WEB_URL } from '@extension/shared/constants';

export const getMemoUrl = (id?: number) => {
  if (id) return `${WEB_URL}/memos?id=${id}`;
  return `${WEB_URL}/memos`;
};

export const getMemoWishListUrl = (id?: number) => {
  if (id) return `${WEB_URL}/memos?wish=true&id=${id}`;
  return `${WEB_URL}/memos?wish=true`;
};
