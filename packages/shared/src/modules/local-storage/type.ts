import { LOCAL_STORAGE_KEYS } from './constant';

export type UpdateVersionType = `updateVersion${number}.${number}.${number}`;
export type BasicStorageKeyType = (typeof LOCAL_STORAGE_KEYS)[number];

export type LocalStorageKeyType = BasicStorageKeyType | UpdateVersionType;
