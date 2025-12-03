"use client";

import type { Language } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { CURRENT_VERSION, getUpdateNotes } from "@web-memo/shared/constants";
import { LocalStorage } from "@web-memo/shared/modules/local-storage";
import { UpdateNotificationDialog as BaseUpdateNotificationDialog } from "@web-memo/ui";

export default function UpdateNotificationDialog({ lng }: { lng: Language }) {
	const { t } = useTranslation(lng);

	async function getDismissedVersion(): Promise<string | null> {
		return LocalStorage.get<string>("dismissedUpdateVersion");
	}

	async function setDismissedVersion(version: string): Promise<void> {
		LocalStorage.set("dismissedUpdateVersion", version);
	}

	const updateNotes = getUpdateNotes(lng);

	const translations = {
		title: t("updateNotification.title"),
		version: t("updateNotification.version"),
		dismiss: t("updateNotification.dismiss"),
		confirm: t("updateNotification.confirm"),
	};

	return (
		<BaseUpdateNotificationDialog
			currentVersion={CURRENT_VERSION}
			updateNotes={updateNotes}
			getDismissedVersion={getDismissedVersion}
			setDismissedVersion={setDismissedVersion}
			translations={translations}
		/>
	);
}
