"use client";

import type { Language } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { LocalStorage } from "@web-memo/shared/modules/local-storage";
import { UpdateNotificationDialog as BaseUpdateNotificationDialog } from "@web-memo/ui";
import packageJson from "../../../../../../../package.json";

const CURRENT_VERSION = packageJson.version;

function getVersionKey(version: string): string {
	const [major, minor] = version.split(".");
	return `v${major}.${minor}.0`;
}

export default function UpdateNotificationDialog({ lng }: { lng: Language }) {
	const { t } = useTranslation(lng);

	async function getDismissedVersion(): Promise<string | null> {
		return LocalStorage.get<string>("dismissedUpdateVersion");
	}

	async function setDismissedVersion(version: string): Promise<void> {
		LocalStorage.set("dismissedUpdateVersion", version);
	}

	const versionKey = getVersionKey(CURRENT_VERSION);
	const updateNotes = t(`updates.versions.${versionKey}.content`, {
		returnObjects: true,
		defaultValue: [],
	}) as string[];

	const translations = {
		title: t("updateNotification.title"),
		version: t("updateNotification.version"),
		dismiss: t("updateNotification.dismiss"),
		confirm: t("updateNotification.confirm"),
	};

	return (
		<BaseUpdateNotificationDialog
			currentVersion={CURRENT_VERSION}
			updateNotes={Array.isArray(updateNotes) ? updateNotes : []}
			getDismissedVersion={getDismissedVersion}
			setDismissedVersion={setDismissedVersion}
			translations={translations}
		/>
	);
}
