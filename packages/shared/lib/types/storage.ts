import { STORAGE_TYPE_OPTION_LANGUAGE } from '../bridge/shared';
import { LANGUAGE_LIST } from '../constants';

export type MemoType = {
  url: string;
  date: string;
  title: string;
  memo: string;
};

export type MemoStorageType = {
  [key: string]: MemoType;
};

export type LanguageOptionStorageType = {
  [STORAGE_TYPE_OPTION_LANGUAGE]: (typeof LANGUAGE_LIST)[number]['inEnglish'];
};

export type StorageType = MemoStorageType | LanguageOptionStorageType;
