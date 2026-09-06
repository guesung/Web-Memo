import { I18n } from "@web-memo/shared/utils/extension";
import { TextShimmer } from "@web-memo/ui";
import { RefreshCwIcon } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useSummaryContext } from "./components/SummaryProvider";

export default function Summary() {
	const { summary, errorMessage, isSummaryLoading, generateSummary } =
		useSummaryContext();

	if (errorMessage)
		return (
			<p className="pt-4 prose prose-sm text-foreground whitespace-pre-wrap">
				{errorMessage}
			</p>
		);

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
					className="hover:text-foreground transition-colors"
				>
					<RefreshCwIcon className="h-8 w-8" />
				</button>
				<p className="text-sm">{I18n.get("summary_empty_message")}</p>
			</div>
		);
	}

	return (
		<Markdown
			remarkPlugins={[remarkGfm]}
			className="markdown pt-4 prose prose-sm text-foreground"
		>
			{summary}
		</Markdown>
	);
}
