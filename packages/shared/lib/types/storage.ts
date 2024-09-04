import { LANGUAGE_LIST } from 'lib/constants';

export type MemoType = {
  url: string;
  date: string;
  title: string;
  memo: string;
};

export type MemoStorageType = {
  [key: string]: MemoType;
};

export type LanguageOptionType = {
  option_language: (typeof LANGUAGE_LIST)[number]['inEnglish'];
};

export type StorageType = MemoStorageType & LanguageOptionType;
