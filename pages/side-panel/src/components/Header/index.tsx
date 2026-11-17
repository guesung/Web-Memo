import { useIsGuest, useOnlineStatus } from "@src/hooks";
import { useTabQuery } from "@web-memo/shared/hooks";
import { I18n } from "@web-memo/shared/utils/extension";
import { Button, IconTooltip } from "@web-memo/ui";
import { GlobeIcon, SettingsIcon } from "lucide-react";
import LoginProviderMenu from "../LoginProviderMenu";
import { ToggleTheme } from "./components";

export default function Header() {
	return (
		<header className="shrink-0 mt-4 flex items-center justify-between gap-2">
			<HeaderTabInfo />
			<div className="flex gap-1 shrink-0">
				<LoginButton />
				<ToggleTheme />
				<IconTooltip label={I18n.get("open_settings")}>
					<Button
						variant="outline"
						size="sm"
						aria-label={I18n.get("open_settings")}
						onClick={() => chrome.runtime.openOptionsPage()}
					>
						<SettingsIcon size={16} />
					</Button>
				</IconTooltip>
			</div>
		</header>
	);
}

/** 비로그인이고 온라인일 때만 보이는 로그인 진입 버튼. 오프라인에서는 로그인 창을 열 수 없다. */
function LoginButton() {
	const isGuest = useIsGuest();
	const isOnline = useOnlineStatus();

	if (!isGuest || !isOnline) {
		return null;
	}

	return (
		<LoginProviderMenu>
			<Button variant="outline" size="sm">
				{I18n.get("login_button")}
			</Button>
		</LoginProviderMenu>
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
