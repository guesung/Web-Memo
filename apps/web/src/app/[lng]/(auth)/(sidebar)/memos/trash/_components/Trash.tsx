"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import {
	useDeletedMemosQuery,
	useDeleteMemosPermanentlyMutation,
	useRestoreMemosMutation,
} from "@web-memo/shared/hooks";
import type { GetMemoResponse } from "@web-memo/shared/types";
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
	Card,
	Loading,
} from "@web-memo/ui";
import dayjs from "dayjs";
import { RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";

interface TrashProps extends LanguageType {}

/** 삭제한 메모 목록. 되살리거나 완전히 지운다 */
export default function Trash({ lng }: TrashProps) {
	const { t } = useTranslation(lng);
	const { data: deletedMemos, isLoading } = useDeletedMemosQuery();
	const { mutate: mutateRestoreMemos } = useRestoreMemosMutation();
	const { mutate: mutateDeleteMemosPermanently } =
		useDeleteMemosPermanentlyMutation();
	const [memoIdsToDelete, setMemoIdsToDelete] = useState<number[]>([]);

	const handleRestoreClick = (id: number) => {
		mutateRestoreMemos([id]);
	};

	const handleConfirmDelete = () => {
		mutateDeleteMemosPermanently(memoIdsToDelete);
		setMemoIdsToDelete([]);
	};

	if (isLoading) {
		return <Loading />;
	}

	if (!deletedMemos || deletedMemos.length === 0) {
		return (
			<p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
				{t("trash.empty")}
			</p>
		);
	}

	return (
		<>
			<div className="mb-4 flex justify-end">
				<Button
					variant="outline"
					size="sm"
					onClick={() =>
						setMemoIdsToDelete(deletedMemos.map((memo) => memo.id))
					}
				>
					<Trash2 size={14} className="mr-1" />
					{t("trash.emptyTrash")}
				</Button>
			</div>

			<ul className="grid gap-3 pb-10">
				{deletedMemos.map((memo) => (
					<TrashItem
						key={memo.id}
						memo={memo}
						restoreLabel={t("trash.restore")}
						deleteLabel={t("trash.deletePermanently")}
						onRestoreClick={handleRestoreClick}
						onDeleteClick={(id) => setMemoIdsToDelete([id])}
					/>
				))}
			</ul>

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
		</>
	);
}

interface TrashItemProps {
	memo: GetMemoResponse;
	restoreLabel: string;
	deleteLabel: string;
	onRestoreClick: (id: number) => void;
	onDeleteClick: (id: number) => void;
}

function TrashItem({
	memo,
	restoreLabel,
	deleteLabel,
	onRestoreClick,
	onDeleteClick,
}: TrashItemProps) {
	return (
		<li>
			<Card className="flex items-center justify-between gap-4 p-4">
				<div className="min-w-0 flex-1">
					<p className="truncate font-medium">{memo.title}</p>
					<p className="truncate text-xs text-gray-500 dark:text-gray-400">
						{memo.url}
					</p>
					<p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
						{dayjs(memo.deleted_at).fromNow()}
					</p>
				</div>

				<div className="flex shrink-0 gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => onRestoreClick(memo.id)}
					>
						<RotateCcw size={14} className="mr-1" />
						{restoreLabel}
					</Button>
					<Button
						variant="ghost"
						size="sm"
						className="text-red-600 hover:text-red-700 dark:text-red-400"
						onClick={() => onDeleteClick(memo.id)}
					>
						{deleteLabel}
					</Button>
				</div>
			</Card>
		</li>
	);
}
