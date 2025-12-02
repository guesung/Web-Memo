import { I18n } from "@web-memo/shared/utils/extension";
import { Button } from "@web-memo/ui";
import { SparklesIcon } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { useSummaryContext } from "./SummaryProvider";

export default function SummaryContent() {
	const { summary, errorMessage, isAutoSummaryEnabled, isSummaryLoading, startSummary } =
		useSummaryContext();

	if (errorMessage)
		return <p className="whitespace-pre-wrap">{errorMessage}</p>;

	if (!isAutoSummaryEnabled && !summary && !isSummaryLoading) {
		return (
			<div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
				<p className="text-muted-foreground">{I18n.get("click_to_summarize")}</p>
				<Button onClick={startSummary} className="gap-2">
					<SparklesIcon size={16} />
					{I18n.get("start_summary")}
				</Button>
			</div>
		);
	}

	return (
		<Markdown remarkPlugins={[remarkGfm]} className="markdown">
			{summary}
		</Markdown>
	);
}
