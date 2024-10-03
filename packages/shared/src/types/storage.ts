import { LANGUAGE_LIST, STORAGE_OPTION_LANGUAGE } from '@src/constants';

export type StorageOptionObjectType = {
  [STORAGE_OPTION_LANGUAGE]: (typeof LANGUAGE_LIST)[number]['inEnglish'];
};

export type StorageType = StorageOptionObjectType;
export type StorageKeyType = keyof StorageOptionObjectType;
