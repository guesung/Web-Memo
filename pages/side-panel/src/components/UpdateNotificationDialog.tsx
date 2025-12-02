import { useDidMount } from "@web-memo/shared/hooks";
import { ChromeSyncStorage, STORAGE_KEYS } from "@web-memo/shared/modules/chrome-storage";
import { I18n } from "@web-memo/shared/utils/extension";
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

const UPDATE_NOTES = [
	"AI 기반 카테고리 자동 추천 기능 추가",
	"랜딩 페이지 전면 리디자인",
	"메모를 선택으로 추가 기능",
];

export default function UpdateNotificationDialog() {
	const [isOpen, setIsOpen] = useState(false);
	const [currentVersion, setCurrentVersion] = useState("");

	useDidMount(() => {
		checkForUpdate();
	});

	async function checkForUpdate() {
		const manifest = chrome.runtime.getManifest();
		const version = manifest.version;
		setCurrentVersion(version);

		const dismissedVersion = await ChromeSyncStorage.get<string>(
			STORAGE_KEYS.dismissedUpdateVersion,
		);

		if (dismissedVersion !== version) {
			setIsOpen(true);
		}
	}

	async function handleDismiss() {
		await ChromeSyncStorage.set(STORAGE_KEYS.dismissedUpdateVersion, currentVersion);
		setIsOpen(false);
	}

	function handleConfirm() {
		setIsOpen(false);
	}

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogContent className="max-w-[340px]" onClose={() => setIsOpen(false)}>
				<DialogHeader>
					<DialogTitle>{I18n.get("update_notification_title")}</DialogTitle>
					<DialogDescription>
						{I18n.get("update_notification_version").replace("{{VERSION}}", currentVersion)}
					</DialogDescription>
				</DialogHeader>
				<div className="py-2">
					<ul className="list-disc pl-5 space-y-1.5 text-sm text-foreground/80">
						{UPDATE_NOTES.map((note) => (
							<li key={note}>{note}</li>
						))}
					</ul>
				</div>
				<DialogFooter className="flex-row gap-2 sm:justify-between">
					<Button variant="ghost" size="sm" onClick={handleDismiss}>
						{I18n.get("update_notification_dismiss")}
					</Button>
					<Button size="sm" onClick={handleConfirm}>
						{I18n.get("update_notification_confirm")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
