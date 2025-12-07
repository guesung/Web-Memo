import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useSummaryContext } from "./SummaryProvider";

export default function SummaryContent() {
	const { summary, errorMessage } = useSummaryContext();

	if (errorMessage)
		return <p className="whitespace-pre-wrap">{errorMessage}</p>;
	return (
		<Markdown remarkPlugins={[remarkGfm]} className="markdown pt-4">
			{summary}
		</Markdown>
	);
}
