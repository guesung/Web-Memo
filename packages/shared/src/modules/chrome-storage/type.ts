import type { STORAGE_KEYS } from './constant';

export type StorageKeyType = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
