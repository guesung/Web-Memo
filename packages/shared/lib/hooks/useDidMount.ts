import { useEffect, useRef } from 'react';

export default function useDidMount(callbackFn: () => void) {
  const _mountRef = useRef(false);

  useEffect(() => {
    if (_mountRef.current) return;
    callbackFn();
    _mountRef.current = true;
  }, [callbackFn]);

  return null;
}
