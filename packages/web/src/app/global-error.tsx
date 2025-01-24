'use client';

import { ErrorContainer } from '@src/app/_components';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <html lang="ko">
      <body>
        <ErrorContainer error={error} reset={reset} />
      </body>
    </html>
  );
}
