import { FallbackComponentProps } from './ErrorBoundary';

interface ErrorFallbackProps extends FallbackComponentProps {}
export default function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div>
      <button className="button" onClick={resetErrorBoundary}>
        재시도
      </button>
      {error.message}
    </div>
  );
}
