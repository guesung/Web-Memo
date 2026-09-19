import { useGetExtensionManifest } from "@src/hooks";
import { analytics } from "@web-memo/shared/modules/analytics";
import { bridge } from "@web-memo/shared/modules/extension-bridge";
import {
	checkLocalStorageTrue,
	setLocalStorageTrue,
} from "@web-memo/shared/modules/local-storage";
import { isMac } from "@web-memo/shared/utils";
import { useToast } from "@web-memo/ui";
import { type Driver, driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useEffect, useRef } from "react";
import type { LanguageType } from "../i18n";
import useTranslation from "../i18n/util.client";

/**
 * 가이드 단계 식별자. steps 배열과 같은 순서다.
 * @description 로깅에만 쓰는 이름이라 화면 문구(번역 키)와 분리해 둔다. 문구가 바뀌어도 지표가 끊기지 않는다.
 */
const GUIDE_STEP_NAMES = [
	"welcome",
	"save",
	"category",
	"settings",
	"check",
] as const;

interface UseGuideProps extends LanguageType {}

/**
 * /memos 첫 방문 가이드를 시작한다.
 * @description 확장이 감지되고 localStorage `guide`가 완료되지 않았을 때 driver를 한 번 만들어 시작한다.
 * 언마운트되면 폴링과 driver를 정리하며, 이때는 가이드를 끝낸 것으로 기록하지 않는다.
 * MemoView에서만 호출한다. 다른 곳에서 부르면 driver.js의 전역 상태를 서로 덮어쓴다.
 * @returns moveNextGuideStep 가이드가 진행 중일 때만 다음 단계로 넘긴다. 진행 중이 아니면 아무 일도 하지 않는다.
 */
export default function useGuide({ lng }: UseGuideProps) {
	const { t } = useTranslation(lng);
	const manifest = useGetExtensionManifest();
	const { toast } = useToast();
	const driverRef = useRef<Driver | null>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: 가이드는 확장이 감지된 시점에 한 번만 시작한다. 번역·토스트 함수는 시작 시점의 값을 쓴다.
	useEffect(() => {
		if (
			!manifest ||
			manifest === "NOT_INSTALLED" ||
			checkLocalStorageTrue("guide")
		) {
			return;
		}

		let isCleanedUp = false;
		let sidePanelPollingInterval: ReturnType<typeof setInterval> | undefined;

		const stopSidePanelPolling = () => {
			clearInterval(sidePanelPollingInterval);
		};

		const driverObj = driver({
			showProgress: true,
			popoverClass: "driverjs-theme",
			nextBtnText: t("guide.next"),
			doneBtnText: t("guide.done"),
			prevBtnText: t("guide.prev"),
			onHighlighted: (_element, _step, { state }) => {
				const stepName = GUIDE_STEP_NAMES[state.activeIndex ?? 0];

				if (!stepName) {
					return;
				}

				analytics.trackEvent({
					name: "guide_step",
					params: { step_name: stepName },
				});
			},
			onDestroyed: () => {
				stopSidePanelPolling();

				// 언마운트로 정리되는 경우는 사용자가 가이드를 끝낸 것이 아니다.
				if (isCleanedUp) {
					return;
				}

				analytics.trackEvent({ name: "guide_finish" });
				setLocalStorageTrue("guide");
				toast({
					title: t("toastTitle.guideDone"),
					description: t("toastTitle.guideDoneDescription"),
				});
			},
			allowClose: false,
			steps: [
				{
					popover: {
						title: t("guide.welcome.title"),
						description: t("guide.welcome.description", {
							key: isMac() ? "Option" : "Alt",
						}),
						onPopoverRender: () => {
							stopSidePanelPolling();
							sidePanelPollingInterval = setInterval(async () => {
								try {
									const isSidePanelOpen =
										await bridge.request.GET_SIDE_PANEL_OPEN();

									if (!isSidePanelOpen || driverObj.getActiveIndex() !== 0) {
										return;
									}

									stopSidePanelPolling();
									driverObj.moveNext();
								} catch {
									// 확장이 응답하지 않는 주기는 건너뛰고 다음 주기에 다시 확인한다.
								}
							}, 500);
						},
					},
				},
				{
					popover: {
						title: t("guide.save.title"),
						description: t("guide.save.description", {
							key: isMac() ? "Command" : "Ctrl",
						}),
					},
				},
				{
					element: "#category",
					popover: {
						title: t("guide.category.title"),
						description: t("guide.category.description"),
					},
				},
				{
					element: "#settings",
					popover: {
						title: t("guide.settings.title"),
						description: t("guide.settings.description"),
					},
					disableActiveInteraction: true,
				},
				{
					element: "#refresh",
					popover: {
						title: t("guide.check.title"),
						description: t("guide.check.description"),
					},
				},
			],
		});

		if (driverObj.isActive()) {
			return;
		}

		driverRef.current = driverObj;
		driverObj.drive();

		return () => {
			isCleanedUp = true;
			stopSidePanelPolling();
			driverRef.current = null;

			if (driverObj.isActive()) {
				driverObj.destroy();
			}
		};
	}, [manifest]);

	const moveNextGuideStep = () => {
		if (!driverRef.current?.isActive()) {
			return;
		}

		driverRef.current.moveNext();
	};

	return { moveNextGuideStep };
}
