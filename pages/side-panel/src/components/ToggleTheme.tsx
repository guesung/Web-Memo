import { Storage } from '@extension/shared/utils/extension';
import { Button } from '@extension/ui';
import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

const makeDarkTheme = () => {
  document.documentElement.classList.add('dark');
  Storage.set('theme', 'dark');
};
const makeLightTheme = () => {
  document.documentElement.classList.remove('dark');
  Storage.set('theme', 'light');
};

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    (async () => {
      const storageTheme = await Storage.get('theme');

      if ((!storageTheme && window.matchMedia('(prefers-color-scheme: dark)').matches) || storageTheme === 'dark') {
        makeDarkTheme();
        setTheme('dark');
      }
    })();
  }, []);

  return { setTheme, theme };
}

export default function ToggleTheme() {
  const { theme, setTheme } = useTheme();

  const handleClick = () => {
    if (theme === 'dark') {
      makeLightTheme();
      setTheme('light');
    } else {
      makeDarkTheme();
      setTheme('dark');
    }
  };

  return (
    <Button onClick={handleClick} variant="outline" size="icon">
      {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} color="black" />}
    </Button>
  );
}
