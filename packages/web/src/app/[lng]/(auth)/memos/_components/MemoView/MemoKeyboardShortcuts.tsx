"use client";

import type { LanguageType } from "@src/modules/i18n";
import { useKeyboardBind } from "@web-memo/shared/hooks";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@web-memo/ui";
import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";

interface MemoKeyboardShortcutsProps extends LanguageType {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

function detectOS(): "mac" | "windows" {
	if (typeof window === "undefined") return "windows";
	return navigator.platform.toLowerCase().includes("mac") ? "mac" : "windows";
}

export default memo(function MemoKeyboardShortcuts({
	lng,
	open,
	onOpenChange,
}: MemoKeyboardShortcutsProps) {
	const { t } = useTranslation(lng);
	const os = useMemo(() => detectOS(), []);

	const modKey = os === "mac" ? "⌘" : "Ctrl";

	const shortcuts = useMemo(
		() => [
			{
				key: `${modKey} + A`,
				description: t("memos.shortcuts.selectAll"),
			},
			{
				key: "Delete",
				description: t("memos.shortcuts.delete"),
			},
			{
				key: "Esc",
				description: t("memos.shortcuts.escape"),
			},
			{
				key: "/",
				description: t("memos.shortcuts.search"),
			},
			{
				key: "?",
				description: t("memos.shortcuts.help"),
			},
		],
		[t, modKey],
	);

	useKeyboardBind({
		key: "?",
		callback: () => onOpenChange(true),
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{t("memos.shortcuts.title")}</DialogTitle>
				</DialogHeader>
				<div className="space-y-3 py-4">
					{shortcuts.map((shortcut) => (
						<div
							key={shortcut.key}
							className="flex items-center justify-between"
						>
							<span className="text-sm text-muted-foreground">
								{shortcut.description}
							</span>
							<kbd className="pointer-events-none inline-flex h-7 select-none items-center gap-1 rounded border bg-muted px-2 font-mono text-xs font-medium text-muted-foreground">
								{shortcut.key}
							</kbd>
						</div>
					))}
				</div>
			</DialogContent>
		</Dialog>
	);
});
