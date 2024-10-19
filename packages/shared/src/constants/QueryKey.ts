import { QueryKey } from '@tanstack/react-query';

type KeyType = 'tab' | 'memoList' | 'option' | 'supabaseClient' | 'user';

export const queryKeys: Record<KeyType, () => QueryKey> = {
  tab: () => ['tab'],
  memoList: () => ['memoList'],
  option: () => ['option'],
  supabaseClient: () => ['supabaseClient'],
  user: () => ['user'],
};
