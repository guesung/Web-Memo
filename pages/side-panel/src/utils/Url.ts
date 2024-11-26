import { CONFIG } from '@extension/shared/constants';

export const getMemoUrl = (id?: number) => {
  if (id) return `${CONFIG.webUrl}/memos?id=${id}`;
  return `${CONFIG.webUrl}/memos`;
};

export const getMemoWishListUrl = (id?: number) => {
  if (id) return `${CONFIG.webUrl}/memos?wish=true&id=${id}`;
  return `${CONFIG.webUrl}/memos?wish=true`;
};
