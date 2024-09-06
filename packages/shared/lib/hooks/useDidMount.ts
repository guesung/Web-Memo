import { useEffect, useRef } from 'react';

export default function useDidMount(callbackFn: () => void) {
  const mountRef = useRef(false);

  useEffect(() => {
    if (mountRef.current) return;
    callbackFn();
    mountRef.current = true;
  }, [callbackFn]);

  return null;
}
