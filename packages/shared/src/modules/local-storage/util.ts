import LocalStorage from './LocalStorage';
import { LocalStorageKeyType } from './type';

export const setLocalStorageTrue = (key: LocalStorageKeyType) => {
  LocalStorage.set(key, true);
};

export const checkLocalStorageTrue = (key: LocalStorageKeyType) => {
  return LocalStorage.get(key) === true;
};
