import IconTooltip from "@src/components/IconTooltip";
import { I18n } from "@web-memo/shared/utils/extension";
import { Loading, TabsTrigger } from "@web-memo/ui";
import { GlobeIcon, RefreshCwIcon, Youtube } from "lucide-react";
import { usePageContentContext } from "../../PageContentProvider";
import { useSummaryContext } from "./Summary/components/SummaryProvider";

export default function SummaryTabTrigger() {
	const { summary, errorMessage, isSummaryLoading, generateSummary } =
		useSummaryContext();
	const { category } = usePageContentContext();
	const CategoryIcon = category === "youtube" ? Youtube : GlobeIcon;
	const canRegenerate = Boolean(summary) && !errorMessage;

	return (
		<TabsTrigger value="summary" className="flex items-center gap-1.5">
			<CategoryIcon size={14} />
			{I18n.get("summary")}
			{canRegenerate && (
				<IconTooltip label={I18n.get("summary_regenerate")}>
					<span
						// biome-ignore lint/a11y/useSemanticElements: 트리거 버튼 안의 새로고침 버튼
						role="button"
						tabIndex={isSummaryLoading ? -1 : 0}
						className="focus-visible:ring-ring ml-1 rounded p-0.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50"
						aria-label={I18n.get("summary_regenerate")}
						aria-disabled={isSummaryLoading}
						onClick={(event) => {
							event.stopPropagation();
							if (!isSummaryLoading) void generateSummary("tab_trigger");
						}}
						onKeyDown={(event) => {
							if (event.key === "Enter" || event.key === " ") {
								event.stopPropagation();
								if (!isSummaryLoading) void generateSummary("tab_trigger");
							}
						}}
					>
						{isSummaryLoading ? (
							<Loading className="size-3.5" />
						) : (
							<RefreshCwIcon size={14} />
						)}
					</span>
				</IconTooltip>
			)}
		</TabsTrigger>
	);
}
