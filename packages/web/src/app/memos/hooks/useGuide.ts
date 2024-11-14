import { useDidMount } from '@extension/shared/hooks';
import { driverObj } from '../utils';
import { IS_USER_SEEN_GUIDE } from '../constants';

export default function useGuide() {
  useDidMount(() => {
    const isUserSeenGuide = window.localStorage.getItem(IS_USER_SEEN_GUIDE);
    if (isUserSeenGuide === 'true') return;

    driverObj.drive();
  });
}
