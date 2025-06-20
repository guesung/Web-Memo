import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { useSummaryContext } from "./SummaryProvider";

export default function Summary() {
	const { summary, errorMessage } = useSummaryContext();

	if (errorMessage)
		return <p className="whitespace-pre-wrap">{errorMessage}</p>;
	return (
		<Markdown remarkPlugins={[remarkGfm]} className="markdown">
			{summary}
		</Markdown>
	);
}
