"use client";

import {
	analytics,
	type TInstallClickPosition,
} from "@web-memo/shared/modules/analytics";
import type { MouseEvent, PropsWithChildren } from "react";

/**
 * `position`으로 보낼 수 있는 값 전체.
 * @description Record로 두어 `TInstallClickPosition`에 값이 추가되면 여기서 타입 에러가 난다.
 * data 속성은 문자열이라 타입이 보장되지 않으므로 이 목록으로 걸러서 보낸다.
 */
const INSTALL_CLICK_POSITION_RECORD: Record<TInstallClickPosition, true> = {
	hero: true,
	recommendation: true,
	final: true,
	install_check_dialog: true,
};

/**
 * 설치 버튼 클릭을 기록하는 래퍼입니다.
 * @description 설치 버튼이 서버 컴포넌트 안에 있어 버튼 자체에 핸들러를 달 수 없습니다.
 * 감싼 영역의 클릭을 캡처해, 가장 가까운 `[data-install-from]` 요소의
 * `data-install-from`·`data-install-position`을 `extension_install_click`으로 보냅니다.
 * 링크의 기본 동작(새 탭 열기)은 막지 않습니다.
 *
 * `data-install-from`에는 언어 접두사를 뺀 경로(`/features/memo`)를 넣습니다.
 */
export default function TrackInstallClick({
	children,
	className,
}: PropsWithChildren<{ className?: string }>) {
	const handleInstallAreaClickCapture = (event: MouseEvent<HTMLDivElement>) => {
		const target = event.target as HTMLElement;
		const installButton = target.closest("[data-install-from]");

		if (!installButton) {
			return;
		}

		const from = installButton.getAttribute("data-install-from");
		const position = installButton.getAttribute("data-install-position");

		if (!from || !position || !isInstallClickPosition(position)) {
			return;
		}

		analytics.trackEvent({
			name: "extension_install_click",
			params: { from, position },
		});
	};

	return (
		<div className={className} onClickCapture={handleInstallAreaClickCapture}>
			{children}
		</div>
	);
}

/** data 속성에서 읽은 문자열이 보낼 수 있는 `position` 값인지 확인합니다. */
const isInstallClickPosition = (
	value: string,
): value is TInstallClickPosition =>
	Object.keys(INSTALL_CLICK_POSITION_RECORD).includes(value);
