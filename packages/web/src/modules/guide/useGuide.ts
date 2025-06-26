import { useGetExtensionManifest } from "@src/hooks";
import { ExtensionBridge } from "@web-memo/shared/modules/extension-bridge";
import {
	checkLocalStorageTrue,
	setLocalStorageTrue,
} from "@web-memo/shared/modules/local-storage";
import { isMac } from "@web-memo/shared/utils";
import { driver } from "driver.js";
import { useEffect } from "react";
import type { LanguageType } from "../i18n";
import useTranslation from "../i18n/util.client";

interface UseGuideProps extends LanguageType {}

export default function useGuide({ lng }: UseGuideProps) {
	const { t } = useTranslation(lng);
	const manifest = useGetExtensionManifest();

	const createDriver = () =>
		driver({
			showProgress: true,
			popoverClass: "driverjs-theme",
			nextBtnText: t("guide.next"),
			doneBtnText: t("guide.done"),
			prevBtnText: t("guide.prev"),
			steps: [
				{
					popover: {
						title: t("guide.welcome.title"),
						description: t("guide.welcome.description", {
							key: isMac() ? "Option" : "Alt",
						}),
						onPopoverRender: () => {
							const interval = setInterval(() => {
								ExtensionBridge.requestGetSidePanelOpen(() => {
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
					element: "#refresh",
					popover: {
						title: t("guide.check.title"),
						description: t("guide.check.description"),
						onNextClick: () => {
							setLocalStorageTrue("guide");
							driverObj.destroy();
						},
					},
				},
			],
		});

	const driverObj = createDriver();

	useEffect(() => {
		if (
			!manifest ||
			manifest === "NOT_INSTALLED" ||
			checkLocalStorageTrue("guide")
		)
			return;

		import("driver.js/dist/driver.css");
		driverObj.drive();
	}, [driverObj, manifest]);

	return { driverObj };
}
