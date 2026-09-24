import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.server";
import { EXTERNAL_LINK, PATHS } from "@web-memo/shared/constants";
import type { TInstallClickPosition } from "@web-memo/shared/modules/analytics";
import { cn } from "@web-memo/shared/utils";
import { ArrowRight, Chrome } from "lucide-react";
import Link from "next/link";
import TrackInstallClick from "../TrackInstallClick";

/**
 * 기능·유스케이스 페이지의 설치 CTA.
 * @description
 * 랜딩의 `InstallButtons`와 달리 스토어 버튼 세 개를 늘어놓지 않는다. 이 열 페이지는
 * 전부 **확장 기능**이 하는 일을 설명하므로, 읽고 난 사람이 할 행동은 하나뿐이다.
 * App Store·Google Play를 같은 줄에 두면 방금 읽은 내용과 무관한 선택지가 되어
 * 결정을 늦춘다. 모바일 앱은 텍스트 링크로 랜딩에 넘긴다.
 *
 * 웹스토어 링크 클릭만 `extension_install_click`으로 남긴다. 랜딩으로 넘기는 링크는
 * 설치가 아니라서 세지 않는다.
 */

interface ExtensionInstallCTAProps extends LanguageType {
	/** 가운데 정렬. 히어로는 좌측(데스크톱), 페이지 끝 CTA는 가운데 */
	isCentered?: boolean;
	className?: string;
	/** 언어 접두사를 뺀 출발 경로. 예: "/features/memo" */
	from: string;
	/** 한 페이지 안에서 이 CTA가 놓인 자리 */
	position: TInstallClickPosition;
}

export default async function ExtensionInstallCTA({
	lng,
	isCentered = false,
	className,
	from,
	position,
}: ExtensionInstallCTAProps) {
	const { t } = await useTranslation(lng);

	return (
		<TrackInstallClick
			className={cn(
				"flex flex-col items-center gap-4 sm:flex-row sm:gap-6",
				isCentered ? "sm:justify-center" : "sm:justify-start",
				className,
			)}
		>
			<Link
				href={EXTERNAL_LINK.chromeWebStoreListing}
				target="_blank"
				rel="noopener noreferrer"
				data-install-from={from}
				data-install-position={position}
				className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-base font-medium text-primary-foreground transition-colors duration-[--duration-base] hover:bg-primary/90"
			>
				<Chrome className="h-4 w-4" />
				{t("landing.install.button")}
			</Link>

			<Link
				href={`/${lng}${PATHS.introduce}`}
				className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:underline"
			>
				{t("landing.install.mobile_hint")}
				<ArrowRight className="h-3.5 w-3.5" />
			</Link>
		</TrackInstallClick>
	);
}
