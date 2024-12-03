import { useEffect } from 'react';

type KeyboardEventKey = 'Backspace' | 'Escape';

interface UseKeyboardBindProps {
  key: KeyboardEventKey;
  callback: () => void;
}

export default function useKeyboardBind({ key, callback }: UseKeyboardBindProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === key) callback();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [key, callback]);
}
