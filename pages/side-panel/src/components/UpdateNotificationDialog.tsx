import {
	ChromeSyncStorage,
	STORAGE_KEYS,
} from "@web-memo/shared/modules/chrome-storage";
import { I18n } from "@web-memo/shared/utils/extension";
import { UpdateNotificationDialog as BaseUpdateNotificationDialog } from "@web-memo/ui";

export default function UpdateNotificationDialog() {
	const manifest = chrome.runtime.getManifest();
	const currentVersion = manifest.version;

	async function getDismissedVersion(): Promise<string | null> {
		return ChromeSyncStorage.get<string>(STORAGE_KEYS.dismissedUpdateVersion);
	}

	async function setDismissedVersion(version: string): Promise<void> {
		await ChromeSyncStorage.set(STORAGE_KEYS.dismissedUpdateVersion, version);
	}

	const updateNotesRaw = I18n.get("update_notification_notes");
	const updateNotes = updateNotesRaw ? updateNotesRaw.split("|") : [];

	const translations = {
		title: I18n.get("update_notification_title"),
		version: I18n.get("update_notification_version"),
		dismiss: I18n.get("update_notification_dismiss"),
		confirm: I18n.get("update_notification_confirm"),
	};

	return (
		<BaseUpdateNotificationDialog
			currentVersion={currentVersion}
			updateNotes={updateNotes}
			getDismissedVersion={getDismissedVersion}
			setDismissedVersion={setDismissedVersion}
			translations={translations}
		/>
	);
}
