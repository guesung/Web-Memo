"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { Button, CardFooter } from "@web-memo/ui";
import { RotateCcw, Trash2 } from "lucide-react";

interface IFTrashCardFooterProps extends LanguageType {
	memoId: number;
	onRestoreClick: (memoId: number) => void;
	onDeleteClick: (memoId: number) => void;
}

/**
 * 휴지통 카드의 푸터. 메모 카드에서 푸터만 이것으로 갈아끼운다.
 *
 * @description 위시·중요·읽는 중 토글은 지운 메모에 의미가 없어 되살리기와 완전 삭제만 둔다.
 */
export default function TrashCardFooter({
	lng,
	memoId,
	onRestoreClick,
	onDeleteClick,
}: IFTrashCardFooterProps) {
	const { t } = useTranslation(lng);

	return (
		<CardFooter className="flex items-center justify-between gap-2 px-5 py-3 border-t border-border">
			<Button
				variant="outline"
				size="sm"
				onClick={() => onRestoreClick(memoId)}
			>
				<RotateCcw size={14} className="mr-1" />
				{t("trash.restore")}
			</Button>
			<Button
				variant="ghost"
				size="sm"
				className="text-destructive hover:text-destructive hover:bg-destructive/10"
				onClick={() => onDeleteClick(memoId)}
			>
				<Trash2 size={14} className="mr-1" />
				{t("trash.deletePermanently")}
			</Button>
		</CardFooter>
	);
}
