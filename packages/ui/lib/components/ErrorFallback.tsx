import { FallbackComponentProps } from './ErrorBoundary';

interface ErrorFallbackProps extends FallbackComponentProps {}
export default function ErrorFallback({ error }: ErrorFallbackProps) {
  const handleRetryClickl = () => {
    window.location.reload();
  };

  return (
    <div className="h-full flex items-center justify-center flex-col gap-4">
      <button className="btn" onClick={handleRetryClickl}>
        재시도
      </button>
      {error.message}
    </div>
  );
}
