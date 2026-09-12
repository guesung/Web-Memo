import { useGetExtensionManifest } from "@src/hooks";
import { analytics } from "@web-memo/shared/modules/analytics";
import { bridge } from "@web-memo/shared/modules/extension-bridge";
import {
	checkLocalStorageTrue,
	setLocalStorageTrue,
} from "@web-memo/shared/modules/local-storage";
import { isMac } from "@web-memo/shared/utils";
import { useToast } from "@web-memo/ui";
import { driver } from "driver.js";
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

export default function useGuide({ lng }: UseGuideProps) {
	const { t } = useTranslation(lng);
	const manifest = useGetExtensionManifest();
	const { toast } = useToast();
	const lastStepNameRef = useRef<string>(GUIDE_STEP_NAMES[0]);

	const createDriver = () =>
		driver({
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

				lastStepNameRef.current = stepName;
				analytics.trackEvent({
					name: "guide_step",
					params: { step_name: stepName },
				});
			},
			onDestroyed: () => {
				analytics.trackEvent({
					name: "guide_exit",
					params: { last_step_name: lastStepNameRef.current },
				});

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
							const interval = setInterval(() => {
								bridge.request.GET_SIDE_PANEL_OPEN().then((isOpen) => {
									if (!isOpen) return;
									if (driverObj.getActiveIndex() !== 0) return;
									driverObj.moveNext();
								});
							}, 500);
							driverObj.destroy = () => clearInterval(interval);
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

	const driverObj = createDriver();

	useEffect(() => {
		if (
			!manifest ||
			manifest === "NOT_INSTALLED" ||
			checkLocalStorageTrue("guide") ||
			driverObj.getState().isInitialized
		)
			return;

		driverObj.drive();
	}, [driverObj, manifest]);

	return { driverObj };
}
