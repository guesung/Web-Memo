import { useCallback, useRef } from 'react';

export default function useThrottle() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const throttle = (callbackFn: () => void, delay = 3000) => {
    if (timerRef.current) return;

    timerRef.current = setTimeout(() => {
      callbackFn();
      timerRef.current = null;
    }, delay);
  };

  const abortThrottle = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { throttle, abortThrottle };
}
