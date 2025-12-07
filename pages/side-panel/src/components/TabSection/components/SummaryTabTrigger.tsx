import { useDidMount } from "@web-memo/shared/hooks";
import { I18n } from "@web-memo/shared/utils/extension";
import { Loading, TabsTrigger } from "@web-memo/ui";
import { GlobeIcon, RefreshCwIcon, Youtube } from "lucide-react";
import { usePageContentContext } from "./PageContentProvider";
import { useSummaryContext } from "./Summary/components";

export default function SummaryTabTrigger() {
	const { isSummaryLoading, generateSummary } = useSummaryContext();
	const { category } = usePageContentContext();

	const CategoryIcon = category === "youtube" ? Youtube : GlobeIcon;

	useDidMount(() => {
		generateSummary();
	});

	return (
		<TabsTrigger value="summary" className="flex items-center gap-1.5">
			<CategoryIcon size={14} />
			{I18n.get("summary")}
			<button
				type="button"
				className="ml-1 p-0.5 rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
				disabled={isSummaryLoading}
				onClick={(e) => {
					e.stopPropagation();

					if (!isSummaryLoading) generateSummary();
				}}
			>
				{isSummaryLoading ? (
					<Loading className="size-3.5" />
				) : (
					<RefreshCwIcon size={14} />
				)}
			</button>
		</TabsTrigger>
	);
}
