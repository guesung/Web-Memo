import { useDidMount } from '@extension/shared/hooks';
import { checkLocalStorageTrue } from '@src/modules/local-storage';
import { driverObj } from '../utils';

export default function useGuide() {
  useDidMount(() => {
    if (checkLocalStorageTrue('guide')) return;

    driverObj.drive();
  });
}
