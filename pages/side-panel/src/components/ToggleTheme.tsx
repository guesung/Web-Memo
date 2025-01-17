import { ChromeSyncStorage } from '@extension/shared/modules/chrome-storage';
import { Button } from '@extension/ui';
import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light');

  const setThemeMode = (theme: Theme) => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    ChromeSyncStorage.set('theme', theme);
    setTheme(theme);
  };

  useEffect(() => {
    (async () => {
      const storageTheme = await ChromeSyncStorage.get('theme');

      const isInitialThemeDark = !storageTheme && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isStorageThemeDark = storageTheme === 'dark';

      if (isInitialThemeDark || isStorageThemeDark) setThemeMode('dark');
    })();
  }, []);

  return { setTheme: setThemeMode, theme };
}

export default function ToggleTheme() {
  const { theme, setTheme } = useTheme();

  const handleClick = () => {
    if (theme === 'dark') setTheme('light');
    else setTheme('dark');
  };

  return (
    <Button
      onClick={handleClick}
      variant="outline"
      size="sm"
      aria-label={`${theme === 'dark' ? '라이트' : '다크'} 모드로 전환`}>
      {theme === 'dark' ? <Moon /> : <Sun color="black" />}
    </Button>
  );
}
