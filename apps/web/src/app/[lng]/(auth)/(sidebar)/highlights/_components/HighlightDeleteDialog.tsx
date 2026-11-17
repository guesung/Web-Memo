"use client";

import type { Language } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@web-memo/ui";

interface HighlightDeleteDialogProps {
	lng: Language;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
}

/** 하이라이트 삭제 전에 한 번 더 확인받는다. */
export function HighlightDeleteDialog({
	lng,
	open,
	onOpenChange,
	onConfirm,
}: HighlightDeleteDialogProps) {
	const { t } = useTranslation(lng);

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{t("highlight.delete.title")}</AlertDialogTitle>
					<AlertDialogDescription>
						{t("highlight.delete.description")}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>{t("highlight.delete.cancel")}</AlertDialogCancel>
					<AlertDialogAction
						onClick={onConfirm}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
						{t("highlight.delete.confirm")}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
