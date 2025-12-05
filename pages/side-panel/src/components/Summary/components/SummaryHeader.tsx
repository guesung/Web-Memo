import type { Category } from "@web-memo/shared/modules/extension-bridge";
import { I18n } from "@web-memo/shared/utils/extension";
import { Button, Loading } from "@web-memo/ui";
import { GlobeIcon, RefreshCwIcon, YoutubeIcon } from "lucide-react";

import { useSummaryContext } from "./SummaryProvider";

const CategoryIcon = ({ category }: { category: Category }) => {
	if (category === "youtube") return <YoutubeIcon size={18} />;
	return <GlobeIcon size={18} />;
};

export default function SummaryHeader() {
	const { isSummaryLoading, refetchSummary, category } = useSummaryContext();

	return (
		<header className="mt-4 flex items-center justify-between">
			<div className="text-md font-bold flex items-center gap-1.5">
				<CategoryIcon category={category} />
				{I18n.get("summary")}
			</div>
			{isSummaryLoading ? (
				<Button variant="outline" size="sm">
					<Loading />
				</Button>
			) : (
				<Button variant="outline" size="sm" onClick={refetchSummary}>
					<RefreshCwIcon size={16} />
				</Button>
			)}
		</header>
	);
}
