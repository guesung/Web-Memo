"use client";

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
import packageJson from "../../../../../../../package.json";

const CURRENT_VERSION = packageJson.version;

function getVersionKey(version: string): string {
	const [major, minor] = version.split(".");
	return `v${major}.${minor}.0`;
}

export default function UpdateNotificationDialog({ lng }: { lng: Language }) {
	const [isOpen, setIsOpen] = useState(false);
	const { t } = useTranslation(lng);

	const versionKey = getVersionKey(CURRENT_VERSION);
	const updateNotes = t(`updates.versions.${versionKey}.content`, {
		returnObjects: true,
		defaultValue: [],
	}) as string[];

	useDidMount(() => {
		checkForUpdate();
	});

	async function checkForUpdate() {
		const dismissedVersion = LocalStorage.get<string>("dismissedUpdateVersion");

		if (dismissedVersion !== CURRENT_VERSION && updateNotes.length > 0) {
			setIsOpen(true);
		}
	}

	function handleDismiss() {
		LocalStorage.set("dismissedUpdateVersion", CURRENT_VERSION);
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
						{t("updateNotification.version", { VERSION: CURRENT_VERSION })}
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
