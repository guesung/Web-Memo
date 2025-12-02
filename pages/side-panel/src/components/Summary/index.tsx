import { SummaryContent, SummaryHeader, SummaryProvider } from "./components";

export default function Summary() {
	return (
		<SummaryProvider>
			<SummaryHeader />
			<SummaryContent />
		</SummaryProvider>
	);
}
