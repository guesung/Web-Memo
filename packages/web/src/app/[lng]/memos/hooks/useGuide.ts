import { useDidMount } from '@extension/shared/hooks';
import { driverObj } from '../utils';
import { LOCAL_STORAGE } from '@src/constants';

export default function useGuide() {
  useDidMount(() => {
    const isUserSeenGuide = window.localStorage.getItem(LOCAL_STORAGE.guide) === 'true';
    if (isUserSeenGuide) return;

    driverObj.drive();
  });
}
