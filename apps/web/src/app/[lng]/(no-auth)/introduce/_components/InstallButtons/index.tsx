import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.server";
import { EXTERNAL_LINK, PATHS } from "@web-memo/shared/constants";
import type { TInstallClickPosition } from "@web-memo/shared/modules/analytics";
import { cn } from "@web-memo/shared/utils";
import { ArrowRight, Chrome } from "lucide-react";
import Link from "next/link";
import TrackInstallClick from "../../../_components/TrackInstallClick";
import { AppleIcon, GooglePlayIcon } from "../StoreIcon";

/**
 * 설치 CTA 묶음.
 * @description
 * 뷰포트에 따라 무엇을 앞세울지가 달라진다.
 *
 * - 640px 미만: 모바일 Chrome은 확장을 지원하지 않는다. Chrome 버튼을 첫 화면에
 *   두면 **실행 불가능한 CTA**가 가장 좋은 자리를 차지하므로, 버튼에서 빼고
 *   "PC에서는 확장으로도 쓸 수 있어요" 텍스트 링크로 격하한다.
 * - 640px 이상: Chrome이 1순위(filled), 두 스토어가 2순위(ghost).
 *
 * 분기는 **CSS로만** 한다. User-Agent로 가르면 SSR 캐시와 어긋나 hydration이
 * 깨지고, 잘못 감지했을 때의 손실이 한 번의 탭보다 크다.
 * 같은 이유로 App Store·Google Play 순서도 기기와 무관하게 고정한다.
 *
 * Chrome 웹스토어로 가는 두 링크(버튼·모바일 텍스트 링크)만 `extension_install_click`으로
 * 남긴다. 앱 스토어 버튼은 확장 설치가 아니라서 세지 않는다.
 */

interface InstallButtonsProps extends LanguageType {
	/** 정렬. Hero는 좌측(데스크톱), FinalCTA는 가운데 */
	isCentered?: boolean;
	className?: string;
	/** 한 페이지 안에서 이 버튼 묶음이 놓인 자리 */
	position: TInstallClickPosition;
}

const PILL_BASE =
	"inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-base font-medium transition-colors duration-[--duration-base]";

const PILL_FILLED = "bg-primary text-primary-foreground hover:bg-primary/90";

const PILL_GHOST =
	"border border-foreground/20 text-foreground hover:bg-secondary";

export default async function InstallButtons({
	lng,
	isCentered = false,
	className,
	position,
}: InstallButtonsProps) {
	const { t } = await useTranslation(lng);

	return (
		<TrackInstallClick className={className}>
			<div
				className={cn(
					"flex flex-wrap gap-3",
					isCentered ? "justify-center" : "justify-center sm:justify-start",
				)}
			>
				<Link
					href={EXTERNAL_LINK.chromeWebStoreListing}
					target="_blank"
					rel="noopener noreferrer"
					data-install-from={PATHS.introduce}
					data-install-position={position}
					className={cn(PILL_BASE, PILL_FILLED, "hidden sm:inline-flex")}
				>
					<Chrome className="h-4 w-4" />
					{t("introduce.hero.install_button")}
				</Link>

				<Link
					href={EXTERNAL_LINK.iosAppStoreListing}
					target="_blank"
					rel="noopener noreferrer"
					className={cn(PILL_BASE, PILL_GHOST)}
				>
					<AppleIcon className="h-4 w-4" />
					{t("introduce.hero.appstore_button")}
				</Link>

				<Link
					href={EXTERNAL_LINK.playStoreListing}
					target="_blank"
					rel="noopener noreferrer"
					className={cn(PILL_BASE, PILL_GHOST)}
				>
					<GooglePlayIcon className="h-4 w-4" />
					{t("introduce.hero.playstore_button")}
				</Link>
			</div>

			{/* 모바일에서만 보이는 확장 안내. 버튼에서 내려온 자리다 */}
			<div
				className={cn(
					"mt-4 flex sm:hidden",
					isCentered ? "justify-center" : "justify-center",
				)}
			>
				<Link
					href={EXTERNAL_LINK.chromeWebStoreListing}
					target="_blank"
					rel="noopener noreferrer"
					data-install-from={PATHS.introduce}
					data-install-position={position}
					className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:underline"
				>
					{t("introduce.hero.desktop_extension_hint")}
					<ArrowRight className="h-3.5 w-3.5" />
				</Link>
			</div>
		</TrackInstallClick>
	);
}
