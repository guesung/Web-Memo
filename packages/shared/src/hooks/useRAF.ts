import { useCallback, useRef } from 'react';

export const useRAF = () => {
  const frameRef = useRef<number>();

  const schedule = useCallback((callback: () => void) => {
    if (frameRef.current) return;

    const animate = () => {
      callback();
      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);
  }, []);

  const cancel = useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = undefined;
    }
  }, []);

  return { schedule, cancel };
};
