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

interface FavoriteDeleteDialogProps {
	lng: Language;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** 삭제 안내에 보여줄 이름 */
	title: string;
	onConfirm: () => void;
}

/** 즐겨찾기 삭제 전에 한 번 더 확인받는다. */
export function FavoriteDeleteDialog({
	lng,
	open,
	onOpenChange,
	title,
	onConfirm,
}: FavoriteDeleteDialogProps) {
	const { t } = useTranslation(lng);

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						{t("favorite.deleteDialog.title")}
					</AlertDialogTitle>
					<AlertDialogDescription>
						{t("favorite.deleteDialog.description", {
							title,
							interpolation: { escapeValue: false },
						})}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>
						{t("favorite.deleteDialog.cancel")}
					</AlertDialogCancel>
					<AlertDialogAction
						onClick={onConfirm}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
						{t("favorite.deleteDialog.confirm")}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
