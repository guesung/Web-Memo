import { LOCAL_STORAGE_KEY } from '.';

export type UpdateVersionType = `updateVersion${number}.${number}.${number}`;

export type LocalStorageKeyType = (typeof LOCAL_STORAGE_KEY)[number] | UpdateVersionType;
