import { Button, Skeleton } from "@web-memo/ui";
import { GlobeIcon, SettingsIcon } from "lucide-react";
import { usePageContentContext } from "../TabSection/components/PageContentProvider";
import { ToggleTheme } from "./components";

export default function Header() {
	const { title, favicon, isLoading } = usePageContentContext();

	return (
		<header className="shrink-0 mt-4 flex items-center justify-between gap-2">
			<div className="flex items-center gap-2 min-w-0 flex-1">
				{isLoading ? (
					<Skeleton className="size-5 rounded" />
				) : favicon ? (
					<img
						src={favicon}
						alt=""
						className="size-5 shrink-0"
						onError={(e) => {
							e.currentTarget.style.display = "none";
						}}
					/>
				) : (
					<GlobeIcon className="size-5 shrink-0 text-muted-foreground" />
				)}
				{isLoading ? (
					<Skeleton className="h-5 w-32" />
				) : (
					<span className="truncate text-sm font-medium" title={title}>
						{title || "Web Memo"}
					</span>
				)}
			</div>
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
