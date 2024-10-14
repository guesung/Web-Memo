import { useDidMount } from '@extension/shared/hooks';
import { driverObj } from '../utils';

const IS_USER_SEEN_GUIDE = 'IS_USER_SEEN_GUIDE';

export default function useGuide() {
  useDidMount(() => {
    const isUserSeenGuide = window.localStorage.getItem(IS_USER_SEEN_GUIDE);
    if (isUserSeenGuide === 'true') return;
    driverObj.drive();
    window.localStorage.setItem(IS_USER_SEEN_GUIDE, 'true');
  });
}
