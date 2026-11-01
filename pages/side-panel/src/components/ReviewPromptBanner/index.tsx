import { I18n } from "@web-memo/shared/utils/extension";
import { Button } from "@web-memo/ui";
import { ExternalLinkIcon, MessageSquareHeartIcon, XIcon } from "lucide-react";
import type { KeyboardEvent } from "react";

/**
 * 메모를 꾸준히 쓰는 사용자에게 웹스토어 리뷰를 부탁하는 인라인 배너.
 * @description 메모 폼 아래 문서 흐름 안에 놓여 입력창이 배너 높이만큼 줄어든다. 포커스를 옮기지 않는다.
 * 현재 사용처: MemoSection/index.tsx
 */
const ReviewPromptBanner = (props: IFReviewPromptBannerProps) => {
	// 배너 안에 포커스가 있을 때만 키 이벤트가 여기까지 올라온다.
	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key === "Escape") {
			event.stopPropagation();
			props.onClose();
		}
	};

	return (
		<div
			// biome-ignore lint/a11y/useSemanticElements: output은 phrasing content만 담을 수 있어 문단·버튼 묶음을 넣지 못한다
			role="status"
			aria-live="polite"
			data-testid="review-prompt-banner"
			className="mt-2 min-w-0 shrink-0 animate-in fade-in rounded-md border bg-background px-2 py-1 text-xs motion-reduce:animate-none"
			onKeyDown={handleKeyDown}
		>
			<div className="flex min-w-0 items-center gap-2">
				<MessageSquareHeartIcon
					className="size-4 shrink-0 text-muted-foreground"
					aria-hidden="true"
				/>
				<p className="min-w-0 flex-1 text-xs text-foreground">
					{I18n.get("review_prompt_message")}
				</p>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="size-8 shrink-0"
					aria-label={I18n.get("review_prompt_close")}
					title={I18n.get("review_prompt_close")}
					onClick={props.onClose}
				>
					<XIcon aria-hidden="true" />
				</Button>
			</div>
			<div className="flex flex-wrap items-center gap-2 pb-1">
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="h-8 text-xs"
					onClick={props.onOpenReview}
				>
					{I18n.get("review_prompt_open")}
					<ExternalLinkIcon className="size-4" aria-hidden="true" />
				</Button>
				<button
					type="button"
					className="ml-auto text-xs text-muted-foreground underline hover:text-foreground"
					onClick={props.onNeverShow}
				>
					{I18n.get("review_prompt_never")}
				</button>
			</div>
		</div>
	);
};

export default ReviewPromptBanner;

/** ReviewPromptBanner props */
interface IFReviewPromptBannerProps {
	/** 닫기(X)나 Esc. 저장소는 건드리지 않는다 */
	onClose: () => void;
	/** 웹스토어에서 리뷰 쓰기 */
	onOpenReview: () => void;
	/** 다시 보지 않기 */
	onNeverShow: () => void;
}
