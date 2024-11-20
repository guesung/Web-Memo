import { Storage } from '@extension/shared/utils/extension';
import { Button } from '@extension/ui';
import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light');

  const setThemeMode = (theme: Theme) => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    Storage.set('theme', theme);
    setTheme(theme);
  };

  useEffect(() => {
    (async () => {
      const storageTheme = await Storage.get('theme');

      if ((!storageTheme && window.matchMedia('(prefers-color-scheme: dark)').matches) || storageTheme === 'dark')
        setThemeMode('dark');
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
    <Button onClick={handleClick} variant="outline" size="icon">
      {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} color="black" />}
    </Button>
  );
}
