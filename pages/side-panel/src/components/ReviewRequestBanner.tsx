import { Button, ErrorBoundary } from "@web-memo/ui";
import { StarIcon, XIcon } from "lucide-react";
import { Suspense } from "react";
import { useReviewRequest } from "@src/hooks";

const REVIEW_URL =
	"https://chromewebstore.google.com/detail/web-memo/eaiojpmgklfngpjddhoalgcpkepgkclh/reviews";

export default function ReviewRequestBanner() {
	return (
		<ErrorBoundary FallbackComponent={() => null}>
			<Suspense fallback={null}>
				<ReviewRequestBannerContent />
			</Suspense>
		</ErrorBoundary>
	);
}

function ReviewRequestBannerContent() {
	const { shouldShow, dismiss } = useReviewRequest();

	if (!shouldShow) return null;

	return (
		<div className="shrink-0 my-2 rounded-lg border bg-muted/50 p-3">
			<div className="flex items-start gap-2">
				<StarIcon className="size-4 shrink-0 text-yellow-500 mt-0.5" />
				<div className="flex-1 min-w-0">
					<p className="text-xs text-foreground">
						Web Memo가 도움이 되셨나요? 리뷰를 남겨주세요!
					</p>
					<div className="flex gap-2 mt-2">
						<Button
							size="sm"
							variant="default"
							className="h-7 text-xs"
							onClick={() => {
								window.open(REVIEW_URL, "_blank");
								dismiss();
							}}
						>
							리뷰 남기기
						</Button>
						<Button
							size="sm"
							variant="ghost"
							className="h-7 text-xs text-muted-foreground"
							onClick={dismiss}
						>
							다시 보지 않기
						</Button>
					</div>
				</div>
				<button
					type="button"
					onClick={dismiss}
					className="shrink-0 text-muted-foreground hover:text-foreground"
				>
					<XIcon className="size-3.5" />
				</button>
			</div>
		</div>
	);
}
