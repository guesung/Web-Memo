import { STORAGE_KEYS } from '@src/constants';

export type StorageKeyType = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
