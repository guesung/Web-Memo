import { useEffect } from 'react';

interface UseScrollSyncProps {
  targetId: string;
}

export default function useScrollSync({ targetId }: UseScrollSyncProps) {
  useEffect(() => {
    const handleWindowScroll = (e: WheelEvent) => {
      const container = document.getElementById(targetId);
      if (!container) return;

      const { deltaY } = e;
      container.scrollTop += deltaY;

      const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight;
      const isAtTop = container.scrollTop === 0;

      if ((deltaY > 0 && !isAtBottom) || (deltaY < 0 && !isAtTop)) {
        e.preventDefault();
      }
    };

    window.addEventListener('wheel', handleWindowScroll, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleWindowScroll);
    };
  }, [targetId]);
}
