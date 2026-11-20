import { useOnlineStatus } from "@src/hooks";
import { I18n } from "@web-memo/shared/utils/extension";
import { Button } from "@web-memo/ui";
import LoginProviderMenu from "./LoginProviderMenu";

/**
 * 로그인해야 쓸 수 있는 기능 자리에 대신 보여 주는 안내.
 * @description 오프라인에서는 로그인 창을 열 수 없으므로 [로그인] 버튼을 숨기고 문구만 남긴다.
 * 현재 사용처: TabSection/components/Summary
 */
export default function LoginRequiredNotice() {
	const isOnline = useOnlineStatus();

	return (
		<div className="flex flex-col items-start gap-3 pt-4 text-sm">
			<p className="text-muted-foreground">
				{I18n.get("login_required_notice")}
			</p>
			{isOnline && (
				<LoginProviderMenu align="start">
					<Button variant="outline" size="sm">
						{I18n.get("login_button")}
					</Button>
				</LoginProviderMenu>
			)}
		</div>
	);
}
