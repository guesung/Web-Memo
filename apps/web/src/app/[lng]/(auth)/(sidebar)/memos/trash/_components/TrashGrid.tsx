"use client";

import { MasonryInfiniteGrid } from "@egjs/react-infinitegrid";
import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { useSettingQuery } from "@web-memo/shared/hooks";
import type { GetMemoResponse } from "@web-memo/shared/types";
import { Badge } from "@web-memo/ui";
import dayjs from "dayjs";

import MemoItem from "../../_components/MemoView/MemoItem";
import TrashCardFooter from "./TrashCardFooter";

interface IFTrashGridProps extends LanguageType {
	memos: GetMemoResponse[];
	onRestoreClick: (memoId: number) => void;
	onDeleteClick: (memoId: number) => void;
}

/**
 * 휴지통의 메모를 메모 목록과 같은 Masonry 그리드로 그린다.
 *
 * @description 카드는 `MemoItem`을 읽기 전용으로 재사용한다. "휴지통을 /memos와 통일한다"의
 * 핵심이 시각적 동일성이라, 전용 카드를 따로 두면 한쪽만 고쳐져 곧 어긋난다.
 * 무한 스크롤은 쓰지 않는다 - 휴지통 목록은 한 번에 받는다.
 */
export default function TrashGrid({
	lng,
	memos,
	onRestoreClick,
	onDeleteClick,
}: IFTrashGridProps) {
	const { t } = useTranslation(lng);
	const { showImpression, showActionItem } = useSettingQuery();

	return (
		<MasonryInfiniteGrid
			useTransform
			useResizeObserver
			observeChildren
			autoResize
			className="container max-w-full pb-48 will-change-transform pt-4"
			useRecycle={false}
			id="trash-grid"
			gap={16}
			align="center"
		>
			{memos.map((memo, index) => (
				<MemoItem
					key={memo.id}
					lng={lng}
					data-grid-groupkey={0}
					index={index}
					memo={memo}
					isReadOnly
					showImpression={showImpression}
					showActionItem={showActionItem}
					badge={
						<Badge variant="outline" className="text-xs font-normal">
							{t("trash.deletedAt", {
								time: dayjs(memo.deleted_at).fromNow(),
							})}
						</Badge>
					}
					footer={
						<TrashCardFooter
							lng={lng}
							memoId={memo.id}
							onRestoreClick={onRestoreClick}
							onDeleteClick={onDeleteClick}
						/>
					}
				/>
			))}
		</MasonryInfiniteGrid>
	);
}
