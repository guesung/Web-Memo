# UI Package

This package provides components that make up the UI.

## Installation

First, move to the page you want to use.

```shell
cd pages/options
```

Add the following to the dependencies in `package.json`.

```json
{
  "dependencies": {
    "@web-memo/ui": "workspace:*"
  }
}
```

Then, run `pnpm install`.

```shell
pnpm install
```

Add the following to the `tailwind.config.js` file.

```js
const baseConfig = require('@web-memo/tailwindcss-config');
const { withUI } = require('@web-memo/ui');

/** @type {import('tailwindcss').Config} */
module.exports = withUI({
  ...baseConfig,
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
});
```

Add the following to the `index.tsx` file.

```tsx
import '@web-memo/ui/dist/global.css';
```

## Add Component

Add the following to the `lib/components/index.ts` file.

```tsx
export * from './Button';
```

Add the following to the `lib/components/Button.tsx` file.

```tsx
import { ComponentPropsWithoutRef } from 'react';
import { cn } from '../utils';

export type ButtonProps = {
  theme?: 'light' | 'dark';
} & ComponentPropsWithoutRef<'button'>;

export function Button({ theme, className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        className,
        'mt-4 rounded px-4 py-1 shadow hover:scale-105',
        theme === 'light' ? 'bg-white text-black' : 'bg-black text-white',
      )}
      {...props}>
      {children}
    </button>
  );
}
```

## Usage

```tsx
import { Button } from '@web-memo/ui';

export default function ToggleButton() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const toggle = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <Button theme={theme} onClick={toggle}>
      Toggle
    </Button>
  );
}
```

## Modifying the tailwind config of the UI library

Modify the `tailwind.config.ts` file to make global style changes to the package.

## Modifying the css variable of the UI library

Modify the css variable in the `ui/lib/global.css` code to change the css variable of the package.
