import { useOnlineStatus } from "@src/hooks";
import { I18n } from "@web-memo/shared/utils/extension";
import { Button } from "@web-memo/ui";
import { CircleAlertIcon, CloudOffIcon, XIcon } from "lucide-react";
import type { KeyboardEvent } from "react";
import LoginProviderMenu from "../LoginProviderMenu";
import type { TGuestBannerVariant } from "./selectGuestBanner";

interface IFGuestLoginBannerProps {
	variant: TGuestBannerVariant;
	/** 기기 메모 개수. 개수 변형의 문구에 쓴다 */
	memoCount: number;
	/** 닫을 때 호출한다. 저장 공간 차단 변형은 닫을 수 없어 호출되지 않는다 */
	onClose: (variant: TGuestBannerVariant) => void;
}

/**
 * 로그인하지 않은 사용자에게 로그인을 권하는 인라인 배너.
 * @description ReviewPromptBanner와 같은 자리·문법이다. 저장 공간이 95% 이상이면 닫을 수 없는
 * 차단 배너가 되어 새 메모를 저장하지 못하는 이유를 설명한다. 오프라인이면 [로그인]을 숨긴다.
 * 현재 사용처: MemoSection/index.tsx
 */
export default function GuestLoginBanner({
	variant,
	memoCount,
	onClose,
}: IFGuestLoginBannerProps) {
	const isOnline = useOnlineStatus();
	const isBlocked = variant === "storageBlocked";

	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key === "Escape" && !isBlocked) {
			event.stopPropagation();
			onClose(variant);
		}
	};

	const Icon = isBlocked ? CircleAlertIcon : CloudOffIcon;

	return (
		<div
			// biome-ignore lint/a11y/useSemanticElements: output은 phrasing content만 담을 수 있어 문단·버튼 묶음을 넣지 못한다
			role="status"
			aria-live={isBlocked ? "assertive" : "polite"}
			data-testid="guest-login-banner"
			data-variant={variant}
			className={`mt-2 min-w-0 shrink-0 animate-in fade-in rounded-md border bg-background px-2 py-1 text-xs motion-reduce:animate-none ${
				isBlocked ? "border-destructive/50 text-destructive" : ""
			}`}
			onKeyDown={handleKeyDown}
		>
			<div className="flex min-w-0 items-center gap-2">
				<Icon
					className={`size-4 shrink-0 ${isBlocked ? "" : "text-muted-foreground"}`}
					aria-hidden="true"
				/>
				<p
					className={`min-w-0 flex-1 text-xs ${isBlocked ? "" : "text-foreground"}`}
				>
					{getMessage(variant, memoCount)}
				</p>
				{!isBlocked && (
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="size-8 shrink-0"
						aria-label={I18n.get("guest_banner_close")}
						title={I18n.get("guest_banner_close")}
						onClick={() => onClose(variant)}
					>
						<XIcon aria-hidden="true" />
					</Button>
				)}
			</div>
			{isOnline && (
				<div className="pb-1">
					<LoginProviderMenu align="start">
						<Button
							type="button"
							variant="link"
							className={`h-8 px-0 text-xs ${isBlocked ? "text-destructive" : ""}`}
						>
							{I18n.get("login_button")}
						</Button>
					</LoginProviderMenu>
				</div>
			)}
		</div>
	);
}

const getMessage = (variant: TGuestBannerVariant, memoCount: number) => {
	switch (variant) {
		case "storageBlocked":
			return I18n.get("guest_banner_storage_blocked");
		case "storageWarning":
			return I18n.get("guest_banner_storage_warning");
		case "countMany":
		case "countFirstMilestone":
			return I18n.get("guest_banner_count", String(memoCount));
		case "firstSave":
			return I18n.get("guest_banner_first_save");
	}
};
