import { useCallback, useRef } from 'react';

export const useRAF = () => {
  const frameRef = useRef<number>();
  const previousTimeRef = useRef<number>();

  const schedule = useCallback((callback: () => void) => {
    if (frameRef.current) return;

    const animate = (currentTime: number) => {
      if (previousTimeRef.current !== undefined) {
        callback();
      }
      previousTimeRef.current = currentTime;
      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);
  }, []);

  const cancel = useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = undefined;
      previousTimeRef.current = undefined;
    }
  }, []);

  return { schedule, cancel };
};
