"use client";

import { useEffect, useState } from "react";
import { Button } from "./button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "./dialog";

export function UpdateNotificationDialog({
	currentVersion,
	updateNotes,
	getDismissedVersion,
	setDismissedVersion,
	translations,
}: UpdateNotificationDialogProps) {
	const [isOpen, setIsOpen] = useState(false);

	useEffect(() => {
		checkForUpdate();
	}, []);

	async function checkForUpdate() {
		const dismissedVersion = await getDismissedVersion();

		if (dismissedVersion !== currentVersion) {
			setIsOpen(true);
		}
	}

	async function handleDismiss() {
		await setDismissedVersion(currentVersion);
		setIsOpen(false);
	}

	function handleConfirm() {
		setIsOpen(false);
	}

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogContent className="max-w-[340px]" onClose={() => setIsOpen(false)}>
				<DialogHeader>
					<DialogTitle>{translations.title}</DialogTitle>
					<DialogDescription>
						{translations.version.replace("{{VERSION}}", currentVersion)}
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
						{translations.dismiss}
					</Button>
					<Button size="sm" onClick={handleConfirm}>
						{translations.confirm}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

interface UpdateNotificationDialogProps {
	currentVersion: string;
	updateNotes: string[];
	getDismissedVersion: () => Promise<string | null>;
	setDismissedVersion: (version: string) => Promise<void>;
	translations: {
		title: string;
		version: string;
		dismiss: string;
		confirm: string;
	};
}
