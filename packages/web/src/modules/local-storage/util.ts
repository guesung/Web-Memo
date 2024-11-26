import { LOCAL_STORAGE_VALUE_MAP, LocalStorage, LocalStorageKeyType } from '.';

export const setLocalStorageTrue = (key: LocalStorageKeyType) => {
  LocalStorage.set(key, LOCAL_STORAGE_VALUE_MAP.true);
};

export const checkLocalStorageTrue = (key: LocalStorageKeyType) => {
  return LocalStorage.get(key) === LOCAL_STORAGE_VALUE_MAP.true;
};
