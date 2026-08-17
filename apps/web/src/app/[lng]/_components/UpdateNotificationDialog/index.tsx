"use client";

import { LATEST_RELEASE_VERSION } from "@src/constants/Update";
import type { Language } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { useDidMount } from "@web-memo/shared/hooks";
import { LocalStorage } from "@web-memo/shared/modules/local-storage";
import {
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@web-memo/ui";
import { useState } from "react";

/** 알림 문구에 넣을 버전 문자열. 번역문이 `v`를 붙이므로 접두사를 떼어 전달합니다. */
const DISPLAY_VERSION = LATEST_RELEASE_VERSION.replace(/^v/, "");

export default function UpdateNotificationDialog({ lng }: { lng: Language }) {
	const [isOpen, setIsOpen] = useState(false);
	const { t } = useTranslation(lng);

	const updateNotes = t(`updates.versions.${LATEST_RELEASE_VERSION}.content`, {
		returnObjects: true,
		defaultValue: [],
	}) as string[];

	useDidMount(() => {
		checkForUpdate();
	});

	async function checkForUpdate() {
		const dismissedVersion = LocalStorage.get<string>("dismissedUpdateVersion");

		if (dismissedVersion !== LATEST_RELEASE_VERSION && updateNotes.length > 0) {
			setIsOpen(true);
		}
	}

	function handleDismiss() {
		LocalStorage.set("dismissedUpdateVersion", LATEST_RELEASE_VERSION);
		setIsOpen(false);
	}

	function handleConfirm() {
		setIsOpen(false);
	}

	if (updateNotes.length === 0) {
		return null;
	}

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogContent className="max-w-[340px]" onClose={() => setIsOpen(false)}>
				<DialogHeader>
					<DialogTitle>{t("updateNotification.title")}</DialogTitle>
					<DialogDescription>
						{t("updateNotification.version", { VERSION: DISPLAY_VERSION })}
					</DialogDescription>
				</DialogHeader>
				<div className="py-2">
					<ul className="list-disc pl-5 space-y-1.5 text-sm text-foreground/80">
						{updateNotes.map((note) => (
							<li key={note}>{note}</li>
						))}
					</ul>
				</div>
				<DialogFooter className="flex-row gap-2 sm:justify-between">
					<Button variant="ghost" size="sm" onClick={handleDismiss}>
						{t("updateNotification.dismiss")}
					</Button>
					<Button size="sm" onClick={handleConfirm}>
						{t("updateNotification.confirm")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
