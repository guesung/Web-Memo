import { I18n } from "@web-memo/shared/utils/extension";
import { TextShimmer } from "@web-memo/ui";
import { RefreshCwIcon } from "lucide-react";
import { formatSummaryText } from "../../../../hooks/useSummary/util";
import { useSummaryContext } from "./components/SummaryProvider";

/** 요약 상태에 따라 안내 또는 동일한 글자 크기의 일반 텍스트를 표시한다. */
const Summary = () => {
	const { summary, errorMessage, isSummaryLoading, generateSummary } =
		useSummaryContext();

	if (errorMessage) {
		return (
			<p className="pt-4 prose prose-sm text-foreground whitespace-pre-wrap">
				{errorMessage}
			</p>
		);
	}

	if (isSummaryLoading && !summary) {
		return (
			<div className="flex h-full flex-1 items-center justify-center">
				<TextShimmer className="text-sm">
					{I18n.get("summary_loading_message")}
				</TextShimmer>
			</div>
		);
	}

	if (!summary && !isSummaryLoading) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground h-full">
				<button
					type="button"
					onClick={generateSummary}
					aria-label={I18n.get("summary_generate_label")}
					className="hover:text-foreground transition-colors"
				>
					<RefreshCwIcon className="h-8 w-8" />
				</button>
				<p className="text-sm">{I18n.get("summary_empty_message")}</p>
			</div>
		);
	}

	return (
		<div className="pt-4 text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">
			{formatSummaryText(summary)}
		</div>
	);
};

export default Summary;
