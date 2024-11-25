import { useDidMount } from '@extension/shared/hooks';
import { driverObj } from '../utils';
import { LocalStorage, LOCAL_STORAGE_KEY_MAP } from '@src/utils';

export default function useGuide() {
  useDidMount(() => {
    if (LocalStorage.check(LOCAL_STORAGE_KEY_MAP.guide)) return;

    driverObj.drive();
  });
}
