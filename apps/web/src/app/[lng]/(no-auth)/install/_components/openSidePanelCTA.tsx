"use client";

import { analytics } from "@web-memo/shared/modules/analytics";
import { bridge } from "@web-memo/shared/modules/extension-bridge";
import { InfoIcon, PanelRightIcon } from "lucide-react";
import { useRef, useState } from "react";
import { useInstallGuideProgress } from "./installGuideProgress";

/** 확장이 응답하지 않을 때 실패로 볼 시간. 옛 버전은 이 메시지를 처리하지 않아 응답이 없다. */
const OPEN_TIMEOUT_MS = 3_000;

/**
 * 설치 가이드의 주 행동. 지금 탭 옆에 사이드 패널을 연다.
 * @description 패널을 연 설치자가 3할 남짓이라, 로그인보다 패널 열기를 먼저 권한다.
 * 로그인은 패널의 안내 화면이 맡는다. 열지 못하면 툴바 아이콘으로 여는 방법을 보여준다.
 */
export function OpenSidePanelCTA({
	label,
	shortcutPrefix,
	failureMessage,
}: OpenSidePanelCTAProps) {
	const [isFailed, setIsFailed] = useState(false);
	const isOpening = useRef(false);
	const { isPanelOpen, markPanelOpen } = useInstallGuideProgress();

	const handleClick = async () => {
		if (isOpening.current) return;
		isOpening.current = true;

		const isSuccess = await requestOpenSidePanel();

		setIsFailed(!isSuccess);
		if (isSuccess) markPanelOpen();
		isOpening.current = false;
		void analytics
			.trackEvent({
				name: "install_guide_panel_open_click",
				params: { is_success: isSuccess },
			})
			.catch((error) => {
				console.warn(
					"[analytics] install_guide_panel_open_click 전송에 실패했습니다.",
					error,
				);
			});
	};

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center gap-x-4 gap-y-3">
				<button
					type="button"
					onClick={handleClick}
					className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
				>
					<PanelRightIcon className="size-4" />
					{label}
				</button>
				<span className="text-sm text-muted-foreground">
					{shortcutPrefix} <Kbd>Alt</Kbd> + <Kbd>S</Kbd>
				</span>
			</div>
			{/* 툴바 아이콘 등 다른 방법으로 열었으면 실패 안내는 더 필요 없다. */}
			{isFailed && !isPanelOpen && (
				<output className="flex items-start gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-sm">
					<InfoIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
					{failureMessage}
				</output>
			)}
		</div>
	);
}

/**
 * 확장에 패널 열기를 요청하고 열렸는지 돌려준다.
 * @description 확장 환경이 아니면 브리지가 빈 응답을 돌려주고, 확장이 없으면 메시지 전송이
 * 거부되며, 옛 버전은 응답하지 않는다. 세 경우 모두 실패로 본다. 응답을 기다리는 시간은 제한한다.
 */
const requestOpenSidePanel = async (): Promise<boolean> => {
	let timeoutId: ReturnType<typeof setTimeout> | undefined;

	try {
		const response = await Promise.race([
			bridge.request.OPEN_SIDE_PANEL_FROM_WEB(),
			new Promise<undefined>((resolve) => {
				timeoutId = setTimeout(() => resolve(undefined), OPEN_TIMEOUT_MS);
			}),
		]);

		return response?.success === true;
	} catch {
		return false;
	} finally {
		clearTimeout(timeoutId);
	}
};

function Kbd({ children }: { children: string }) {
	return (
		<kbd className="rounded border border-b-2 border-border bg-muted px-1.5 font-mono text-xs">
			{children}
		</kbd>
	);
}

interface OpenSidePanelCTAProps {
	label: string;
	shortcutPrefix: string;
	failureMessage: string;
}
