import type { FallbackComponentProps } from "./ErrorBoundary";

interface ErrorFallbackProps extends FallbackComponentProps {}
export default function ErrorFallback({ error }: ErrorFallbackProps) {
	const handleRetryClickl = () => {
		window.location.reload();
	};

	return (
		<div className="flex h-full flex-col items-center justify-center gap-4">
			<button className="btn" onClick={handleRetryClickl}>
				재시도
			</button>
			{error.message}
		</div>
	);
}
