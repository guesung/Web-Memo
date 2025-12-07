import { I18n } from "@web-memo/shared/utils/extension";
import { RefreshCwIcon } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useSummaryContext } from "./components/SummaryProvider";

export default function Summary() {
	const { summary, errorMessage, isSummaryLoading, generateSummary } =
		useSummaryContext();

	if (errorMessage)
		return <p className="whitespace-pre-wrap">{errorMessage}</p>;

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
			className="markdown pt-4 prose prose-sm dark:prose-invert text-foreground"
		>
			{summary}
		</Markdown>
	);
}
