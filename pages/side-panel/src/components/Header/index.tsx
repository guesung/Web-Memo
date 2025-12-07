import { useTabQuery } from "@web-memo/shared/hooks";
import { Button, Skeleton } from "@web-memo/ui";
import { GlobeIcon, SettingsIcon } from "lucide-react";
import { Suspense } from "react";
import { ToggleTheme } from "./components";

export default function Header() {
	return (
		<header className="shrink-0 mt-4 flex items-center justify-between gap-2">
			<Suspense
				fallback={
					<div className="flex items-center gap-2 min-w-0 flex-1">
						<Skeleton className="size-5 rounded" />
						<Skeleton className="h-5 w-32" />
					</div>
				}
			>
				<HeaderTabInfo />
			</Suspense>
			<div className="flex gap-1 shrink-0">
				<ToggleTheme />
				<Button
					variant="outline"
					size="sm"
					onClick={() => chrome.runtime.openOptionsPage()}
				>
					<SettingsIcon size={16} />
				</Button>
			</div>
		</header>
	);
}

function HeaderTabInfo() {
	const { data: tab } = useTabQuery();

	return (
		<div className="flex items-center gap-2 min-w-0 flex-1">
			{tab?.favIconUrl ? (
				<img
					src={tab.favIconUrl}
					alt=""
					className="size-5 shrink-0"
					onError={(e) => {
						e.currentTarget.style.display = "none";
					}}
				/>
			) : (
				<GlobeIcon className="size-5 shrink-0 text-muted-foreground" />
			)}
			<span className="truncate text-sm font-medium" title={tab?.title || ""}>
				{tab?.title ?? "Web Memo"}
			</span>
		</div>
	);
}
