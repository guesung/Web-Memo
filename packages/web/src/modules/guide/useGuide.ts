import { useDidMount } from '@extension/shared/hooks';
import { checkLocalStorageTrue } from '@extension/shared/modules/local-storage';
import { driverObj } from './constant';

export default function useGuide() {
  useDidMount(() => {
    if (checkLocalStorageTrue('guide')) return;

    driverObj.drive();
  });
}
