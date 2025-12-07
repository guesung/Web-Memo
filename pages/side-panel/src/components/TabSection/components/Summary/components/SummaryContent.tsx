import { useDidMount } from "@web-memo/shared/hooks";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useSummaryContext } from "./SummaryProvider";

export default function SummaryContent() {
	const { summary, errorMessage, generateSummary } = useSummaryContext();

	useDidMount(() => {
		generateSummary();
	});

	if (errorMessage)
		return <p className="whitespace-pre-wrap">{errorMessage}</p>;
	return (
		<Markdown
			remarkPlugins={[remarkGfm]}
			className="markdown prose prose-sm text-foreground dark:text-white pt-4"
		>
			{summary}
		</Markdown>
	);
}
