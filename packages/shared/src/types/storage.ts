import { LANGUAGE_LIST, STORAGE_TYPE_OPTION_LANGUAGE, STORAGE_TYPE_OPTION_LIST } from '@src/constants';

export type MemoType = {
  url: string;
  date: string;
  title: string;
  memo: string;
};

export type StorageMemoType = {
  [key: string]: MemoType;
};

export type StorageMemoTypeType = 'chrome-storage' | 'supabase';

export type StorageOptionType = {
  [STORAGE_TYPE_OPTION_LANGUAGE]: (typeof LANGUAGE_LIST)[number]['inEnglish'];
};
export type StorageOptionKeyType = (typeof STORAGE_TYPE_OPTION_LIST)[number];

export type StorageType = StorageMemoType | StorageOptionType;
