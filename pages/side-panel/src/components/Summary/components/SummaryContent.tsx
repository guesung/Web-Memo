import { lazy, Suspense, useEffect, useState } from "react";
import type { PluggableList } from "unified";

import { useSummaryContext } from "./SummaryProvider";

// react-markdown 동적 로딩으로 초기 번들 크기 감소
const Markdown = lazy(() => import("react-markdown"));

function MarkdownContent({ content }: { content: string }) {
	const [remarkPlugins, setRemarkPlugins] = useState<PluggableList>([]);

	useEffect(() => {
		import("remark-gfm").then((mod) => {
			setRemarkPlugins([mod.default]);
		});
	}, []);

	return (
		<Suspense fallback={<p className="whitespace-pre-wrap">{content}</p>}>
			<Markdown remarkPlugins={remarkPlugins} className="markdown">
				{content}
			</Markdown>
		</Suspense>
	);
}

export default function SummaryContent() {
	const { summary, errorMessage } = useSummaryContext();

	if (errorMessage)
		return <p className="whitespace-pre-wrap">{errorMessage}</p>;

	if (!summary) return null;

	return <MarkdownContent content={summary} />;
}
