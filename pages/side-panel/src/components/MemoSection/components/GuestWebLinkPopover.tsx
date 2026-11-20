import { useOnlineStatus } from "@src/hooks";
import { I18n } from "@web-memo/shared/utils/extension";
import {
	Button,
	IconTooltip,
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@web-memo/ui";
import { ExternalLinkIcon } from "lucide-react";
import LoginProviderMenu from "../../LoginProviderMenu";

/**
 * 비로그인에서 메모 헤더의 웹 링크를 눌렀을 때 웹 대신 보여 주는 안내.
 * @description 기기 메모는 웹에 없으므로 새 탭을 열지 않고, 로그인하면 웹·앱에서 볼 수 있다고 알린다.
 * [로그인]은 같은 카카오·Google 선택 메뉴를 연다. 오프라인이면 [로그인]을 숨긴다.
 * 현재 사용처: MemoSection/components/MemoHeader.tsx
 */
export default function GuestWebLinkPopover() {
	const isOnline = useOnlineStatus();

	return (
		<Popover>
			<IconTooltip label={I18n.get("open_in_new_tab")}>
				<PopoverTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						className="size-8"
						aria-label={I18n.get("open_in_new_tab")}
					>
						<ExternalLinkIcon className="size-4" />
					</Button>
				</PopoverTrigger>
			</IconTooltip>
			<PopoverContent
				align="start"
				data-testid="guest-web-link-popover"
				className="flex w-[240px] flex-col items-start gap-2 p-3 text-xs"
			>
				<p>{I18n.get("guest_web_link_message")}</p>
				{isOnline && (
					<LoginProviderMenu align="start">
						<Button type="button" size="sm" className="h-8 text-xs">
							{I18n.get("login_button")}
						</Button>
					</LoginProviderMenu>
				)}
			</PopoverContent>
		</Popover>
	);
}
