import { useEffect } from 'react';

interface UseDragProps {
  onMouseDown: (e: MouseEvent) => void;
}

export default function useDrag({ onMouseDown }: UseDragProps) {
  useEffect(() => {
    document.body.addEventListener('mousedown', onMouseDown);

    return () => {
      document.body.removeEventListener('mousedown', onMouseDown);
    };
  }, []);
}
