'use client';

import { ErrorContainer } from '@src/app/_components';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <html>
      <body>
        <ErrorContainer error={error} reset={reset} />
      </body>
    </html>
  );
}
