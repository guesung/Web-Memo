'use client';

import { ErrorSection } from '@src/app/_components';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <html lang="ko">
      <body>
        <ErrorSection error={error} reset={reset} />
      </body>
    </html>
  );
}
