import type { LanguageType } from "@src/modules/i18n";
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

interface DeleteConfirmDialogProps extends LanguageType {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	selectedCount: number;
	onConfirm: () => void;
}

export default function DeleteConfirmDialog({
	lng,
	open,
	onOpenChange,
	selectedCount,
	onConfirm,
}: DeleteConfirmDialogProps) {
	const { t } = useTranslation(lng);

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						{t("dialogDeleteMemos.title", { count: selectedCount })}
					</AlertDialogTitle>
					<AlertDialogDescription>
						{t("dialogDeleteMemos.description", { count: selectedCount })}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>{t("dialogDeleteMemos.cancel")}</AlertDialogCancel>
					<AlertDialogAction
						onClick={onConfirm}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
						{t("dialogDeleteMemos.ok")}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
