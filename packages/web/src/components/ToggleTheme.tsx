'use client';

import { Button } from '@src/components/ui';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@src/components/ui';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

export default function ToggleTheme() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>라이트</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>다크</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>시스템</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
