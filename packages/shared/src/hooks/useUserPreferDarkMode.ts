import { useRef } from 'react';
import useDidMount from './useDidMount';

export default function useUserPreferDarkMode() {
  const isUserPreferDarkModeRef = useRef(false);

  useDidMount(() => {
    if (!isUserPreferDarkModeRef) return;

    isUserPreferDarkModeRef.current = window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  return { isUserPreferDarkMode: isUserPreferDarkModeRef.current };
}
