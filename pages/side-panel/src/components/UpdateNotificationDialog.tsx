import { CURRENT_VERSION, getUpdateNotes } from "@web-memo/shared/constants";
import {
	ChromeSyncStorage,
	STORAGE_KEYS,
} from "@web-memo/shared/modules/chrome-storage";
import { I18n } from "@web-memo/shared/utils/extension";
import { UpdateNotificationDialog as BaseUpdateNotificationDialog } from "@web-memo/ui";

export default function UpdateNotificationDialog() {
	async function getDismissedVersion(): Promise<string | null> {
		return ChromeSyncStorage.get<string>(STORAGE_KEYS.dismissedUpdateVersion);
	}

	async function setDismissedVersion(version: string): Promise<void> {
		await ChromeSyncStorage.set(STORAGE_KEYS.dismissedUpdateVersion, version);
	}

	const language = I18n.getUILanguage().startsWith("ko") ? "ko" : "en";
	const updateNotes = getUpdateNotes(CURRENT_VERSION, language);

	const translations = {
		title: I18n.get("update_notification_title"),
		version: I18n.get("update_notification_version"),
		dismiss: I18n.get("update_notification_dismiss"),
		confirm: I18n.get("update_notification_confirm"),
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
