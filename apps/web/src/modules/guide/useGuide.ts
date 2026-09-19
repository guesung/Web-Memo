import { useGetExtensionManifest } from "@src/hooks";
import { analytics } from "@web-memo/shared/modules/analytics";
import { bridge } from "@web-memo/shared/modules/extension-bridge";
import {
	checkLocalStorageTrue,
	setLocalStorageTrue,
} from "@web-memo/shared/modules/local-storage";
import { isMac } from "@web-memo/shared/utils";
import { useToast } from "@web-memo/ui";
import { type Driver, type DriveStep, driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useEffect, useRef } from "react";
import type { LanguageType } from "../i18n";
import useTranslation from "../i18n/util.client";

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
	const guideRef = useRef<IFGuideHandle | null>(null);

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

		const guideSteps: IFGuideStep[] = [
			{
				name: "welcome",
				step: {
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
									moveToNextAvailableStep();
								} catch {
									// 확장이 응답하지 않는 주기는 건너뛰고 다음 주기에 다시 확인한다.
								}
							}, 500);
						},
					},
				},
			},
			{
				name: "save",
				step: {
					popover: {
						title: t("guide.save.title"),
						description: t("guide.save.description"),
					},
				},
			},
			{
				name: "category",
				step: {
					element: "#category",
					popover: {
						title: t("guide.category.title"),
						description: t("guide.category.description"),
					},
				},
			},
			{
				name: "settings",
				step: {
					element: "#settings",
					popover: {
						title: t("guide.settings.title"),
						description: t("guide.settings.description"),
					},
					disableActiveInteraction: true,
				},
			},
			{
				name: "check",
				step: {
					element: "#refresh",
					popover: {
						title: t("guide.check.title"),
						description: t("guide.check.description"),
					},
				},
			},
		];

		/**
		 * 대상 요소가 DOM에 있는 다음 단계로 넘어가고, 없으면 가이드를 끝낸다.
		 * @description driver.js는 요소가 없으면 건너뛰지 않고 화면 중앙에 설명만 띄운다.
		 * 늦게 뜨는 요소(`#refresh`)를 지우지 않도록 시작 시점이 아니라 단계를 넘기는 시점에 확인한다.
		 */
		const moveToNextAvailableStep = () => {
			const activeIndex = driverObj.getActiveIndex();

			if (activeIndex === undefined) {
				return;
			}

			const nextIndex = findAvailableStepIndex({
				steps: guideSteps,
				fromIndex: activeIndex,
				direction: 1,
			});

			if (nextIndex === undefined) {
				driverObj.destroy();
				return;
			}

			driverObj.moveTo(nextIndex);
		};

		/** 대상 요소가 DOM에 있는 이전 단계로 돌아간다. 없으면 현재 단계에 머문다. */
		const moveToPreviousAvailableStep = () => {
			const activeIndex = driverObj.getActiveIndex();

			if (activeIndex === undefined) {
				return;
			}

			const previousIndex = findAvailableStepIndex({
				steps: guideSteps,
				fromIndex: activeIndex,
				direction: -1,
			});

			if (previousIndex === undefined) {
				return;
			}

			driverObj.moveTo(previousIndex);
		};

		const driverObj = driver({
			showProgress: true,
			popoverClass: "driverjs-theme",
			nextBtnText: t("guide.next"),
			doneBtnText: t("guide.done"),
			prevBtnText: t("guide.prev"),
			onHighlighted: (_element, _step, { state }) => {
				const stepName = guideSteps[state.activeIndex ?? 0]?.name;

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
			onNextClick: moveToNextAvailableStep,
			onPrevClick: moveToPreviousAvailableStep,
			allowClose: false,
			steps: guideSteps.map(({ step }) => step),
		});

		if (driverObj.isActive()) {
			return;
		}

		guideRef.current = { driver: driverObj, moveToNextAvailableStep };
		driverObj.drive();

		return () => {
			isCleanedUp = true;
			stopSidePanelPolling();
			guideRef.current = null;

			if (driverObj.isActive()) {
				driverObj.destroy();
			}
		};
	}, [manifest]);

	const moveNextGuideStep = () => {
		if (!guideRef.current?.driver.isActive()) {
			return;
		}

		guideRef.current.moveToNextAvailableStep();
	};

	return { moveNextGuideStep };
}

/** 가이드 한 단계. 이름은 지표 로깅에만 쓰고, 화면 문구(번역 키)와 분리해 둔다. */
interface IFGuideStep {
	/** 단계 식별자. 문구가 바뀌어도 지표가 끊기지 않는다. */
	name: string;
	/** driver.js 단계 설정 */
	step: DriveStep;
}

/** 대상 요소가 없는 단계는 건너뛴다. 요소를 지정하지 않은 단계는 항상 있는 것으로 본다. */
const hasGuideTarget = ({ step }: IFGuideStep) => {
	return (
		typeof step.element !== "string" ||
		document.querySelector(step.element) !== null
	);
};

/**
 * fromIndex 다음부터 direction 방향으로 대상 요소가 있는 첫 단계의 인덱스를 찾는다.
 * 없으면 undefined.
 */
const findAvailableStepIndex = ({
	steps,
	fromIndex,
	direction,
}: {
	steps: IFGuideStep[];
	fromIndex: number;
	direction: 1 | -1;
}) => {
	for (
		let index = fromIndex + direction;
		index >= 0 && index < steps.length;
		index += direction
	) {
		if (hasGuideTarget(steps[index])) {
			return index;
		}
	}

	return undefined;
};

/** MemoView 밖에서 가이드를 조작하기 위한 핸들. */
interface IFGuideHandle {
	/** 진행 여부를 확인하는 driver */
	driver: Driver;
	/** 요소가 있는 다음 단계로 넘어가고, 없으면 가이드를 끝낸다. */
	moveToNextAvailableStep: () => void;
}
