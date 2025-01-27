import { useEffect } from 'react';

type KeyboardEventKey = 'Backspace' | 'Escape' | 's';

interface UseKeyboardBindProps {
  key: KeyboardEventKey;
  callback: () => void;
  isMetaKey?: boolean;
}

export default function useKeyboardBind({ key, callback, isMetaKey = false }: UseKeyboardBindProps) {
  useEffect(
    function keyboardBind() {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (isMetaKey ? event.metaKey : true && event.key === key) {
          event.preventDefault();

          callback();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    },
    [key, callback],
  );
}
