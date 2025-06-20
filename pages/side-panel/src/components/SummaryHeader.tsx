import type { Category } from "@extension/shared/modules/extension-bridge";
import { I18n } from "@extension/shared/utils/extension";
import { Button, ErrorBoundary, Loading } from "@extension/ui";
import { RefreshCwIcon, SettingsIcon } from "lucide-react";

import { useSummaryContext } from "./SummaryProvider";
import ToggleTheme from "./ToggleTheme";

const getCategoryText = (category: Category) => {
	if (category === "youtube") return I18n.get("youtube");
	return I18n.get("webSite");
};

export default function Header() {
	const { isSummaryLoading, refetchSummary, category } = useSummaryContext();

	const categoryText = getCategoryText(category);

	const handleRefreshClick = () => {
		refetchSummary();
	};

	const handleOptionClick = () => {
		chrome.runtime.openOptionsPage();
	};

	return (
		<header className="mt-4 flex items-center justify-between">
			<div className="text-md font-bold">
				{I18n.get("summary")} - {categoryText}
			</div>
			<div className="flex gap-1">
				<ErrorBoundary>
					<ToggleTheme />
				</ErrorBoundary>
				{isSummaryLoading ? (
					<Button variant="outline" size="sm">
						<Loading />
					</Button>
				) : (
					<Button variant="outline" size="sm" onClick={handleRefreshClick}>
						<RefreshCwIcon size={16} />
					</Button>
				)}
				<Button variant="outline" size="sm" onClick={handleOptionClick}>
					<SettingsIcon size={16} />
				</Button>
			</div>
		</header>
	);
}
