import { Button } from "@web-memo/ui";
import { SettingsIcon } from "lucide-react";
import { ToggleTheme } from ".";

export default function GlobalHeader() {
	return (
		<header className="shrink-0 mt-4 flex items-center justify-between">
			<h1 className="text-lg font-bold">Web Memo</h1>
			<div className="flex gap-1">
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
