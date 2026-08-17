# UI 패키지

UI를 구성하는 컴포넌트를 제공하는 패키지입니다.

## 설치

먼저 사용하려는 페이지로 이동합니다.

```shell
cd pages/options
```

`package.json`의 dependencies에 아래 내용을 추가합니다.

```json
{
  "dependencies": {
    "@web-memo/ui": "workspace:*"
  }
}
```

그다음 `pnpm install`을 실행합니다.

```shell
pnpm install
```

`tailwind.config.js` 파일에 아래 내용을 추가합니다.

```js
const baseConfig = require('@web-memo/tailwindcss-config');
const { withUI } = require('@web-memo/ui');

/** @type {import('tailwindcss').Config} */
module.exports = withUI({
  ...baseConfig,
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
});
```

`index.tsx` 파일에 아래 내용을 추가합니다.

```tsx
import '@web-memo/ui/dist/global.css';
```

## 컴포넌트 추가

`lib/components/index.ts` 파일에 아래 내용을 추가합니다.

```tsx
export * from './Button';
```

`lib/components/Button.tsx` 파일에 아래 내용을 추가합니다.

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

## 사용법

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

## UI 라이브러리의 tailwind 설정 수정

패키지 전역 스타일을 바꾸려면 `tailwind.config.ts` 파일을 수정하세요.

## UI 라이브러리의 css 변수 수정

패키지의 css 변수를 바꾸려면 `ui/lib/global.css` 코드의 css 변수를 수정하세요.
