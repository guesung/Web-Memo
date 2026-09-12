"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import {
	useDeletedMemosQuery,
	useDeleteMemosPermanentlyMutation,
	useRestoreMemosMutation,
} from "@web-memo/shared/hooks";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	Button,
	toast,
} from "@web-memo/ui";
import { Trash2 } from "lucide-react";
import { useState } from "react";

import { MemoGridSkeleton } from "../../_components";
import TrashEmptyState from "./TrashEmptyState";
import TrashGrid from "./TrashGrid";

interface IFTrashProps extends LanguageType {}

/** 삭제한 메모 목록. 되살리거나 완전히 지운다 */
export default function Trash({ lng }: IFTrashProps) {
	const { t } = useTranslation(lng);
	const { data: deletedMemos, isLoading } = useDeletedMemosQuery();
	const { mutate: mutateRestoreMemos } = useRestoreMemosMutation();
	const { mutate: mutateDeleteMemosPermanently } =
		useDeleteMemosPermanentlyMutation();
	const [memoIdsToDelete, setMemoIdsToDelete] = useState<number[]>([]);

	const handleRestoreClick = (memoId: number) => {
		mutateRestoreMemos([memoId], {
			onError: () => toast({ title: t("trash.restoreFailed") }),
		});
	};

	const handleConfirmDelete = () => {
		mutateDeleteMemosPermanently(memoIdsToDelete, {
			onError: () => toast({ title: t("trash.deleteFailed") }),
		});
		setMemoIdsToDelete([]);
	};

	const handleDeleteClick = (memoId: number) => {
		setMemoIdsToDelete([memoId]);
	};

	const handleEmptyTrashClick = () => {
		if (!deletedMemos) {
			return;
		}

		setMemoIdsToDelete(deletedMemos.map((memo) => memo.id));
	};

	if (isLoading) {
		return <MemoGridSkeleton />;
	}

	if (!deletedMemos || deletedMemos.length === 0) {
		return <TrashEmptyState lng={lng} />;
	}

	return (
		<div className="flex w-full flex-col gap-4">
			<div className="flex w-full items-center justify-between">
				<p className="text-muted-foreground select-none text-sm flex items-center gap-2">
					<span className="w-2 h-2 bg-primary rounded-full" />
					{t("trash.totalMemos", { total: deletedMemos.length })}
				</p>
				<Button variant="outline" size="sm" onClick={handleEmptyTrashClick}>
					<Trash2 size={14} className="mr-1" />
					{t("trash.emptyTrash")}
				</Button>
			</div>

			<TrashGrid
				lng={lng}
				memos={deletedMemos}
				onRestoreClick={handleRestoreClick}
				onDeleteClick={handleDeleteClick}
			/>

			<AlertDialog
				open={memoIdsToDelete.length > 0}
				onOpenChange={(open) => {
					if (!open) {
						setMemoIdsToDelete([]);
					}
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{t("trash.confirmTitle", { count: memoIdsToDelete.length })}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{t("trash.confirmDescription")}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t("trash.cancel")}</AlertDialogCancel>
						<AlertDialogAction onClick={handleConfirmDelete}>
							{t("trash.ok")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
