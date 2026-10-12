"use client";

import { MasonryInfiniteGrid } from "@egjs/react-infinitegrid";
import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import type {
	GetMemoResponse,
	HighlightMemoLink,
	HighlightRow,
} from "@web-memo/shared/types";
import MemoItem from "./MemoItem";
import { restoreHeldScrollPosition } from "./scrollPositionHold";

/** 한 날짜에 속한 메모를 왼쪽 날짜 열과 카드 masonry로 보여준다. */
const MemoDateGroup = ({
	lng,
	dateKey,
	memos,
	highlightsByUrl,
	sourcesByMemo,
	showImpression,
	showActionItem,
	truncateMemoContent,
	onRenderComplete,
}: IFMemoDateGroupProps) => {
	const { t } = useTranslation(lng);
	const dateFormatter = new Intl.DateTimeFormat(lng, { dateStyle: "long" });
	const weekdayFormatter = new Intl.DateTimeFormat(lng, { weekday: "long" });

	return (
		<section
			data-testid="memo-date-group"
			aria-labelledby={`memo-date-${dateKey}`}
			className="grid grid-cols-1 gap-4 md:grid-cols-[144px_minmax(0,1fr)] md:gap-6"
		>
			<h2
				data-testid="memo-date-label"
				id={`memo-date-${dateKey}`}
				className="border-b border-border pb-3 text-sm font-semibold md:border-b-0 md:border-r md:pb-0 md:pr-4"
			>
				{dateKey === "unknown" ? (
					t("memos.view.unknownDate")
				) : (
					<time
						dateTime={dateKey}
						className="flex flex-wrap items-baseline gap-x-2 gap-y-1 md:flex-col"
					>
						<span>{dateFormatter.format(new Date(`${dateKey}T00:00:00`))}</span>
						<span className="text-xs font-normal text-muted-foreground">
							{weekdayFormatter.format(new Date(`${dateKey}T00:00:00`))}
						</span>
					</time>
				)}
			</h2>
			<MasonryInfiniteGrid
				tag="ul"
				data-testid="memo-date-grid"
				className="min-w-0 max-w-[300px] md:max-w-none"
				useResizeObserver
				observeChildren
				autoResize
				useRecycle={false}
				gap={16}
				align="start"
				onRenderComplete={(event) => {
					restoreHeldScrollPosition();
					onRenderComplete?.(
						dateKey,
						event.items.map((item) => item.element?.dataset.memoId).join(","),
					);
				}}
			>
				{memos.map((memo, index) => (
					<li
						data-testid="memo-list-item"
						data-memo-id={memo.id}
						key={memo.id}
						data-grid-groupkey={dateKey}
						className="w-[300px] max-w-full"
					>
						<MemoItem
							lng={lng}
							memo={memo}
							highlights={highlightsByUrl.get(memo.url)}
							source={sourcesByMemo.get(memo.id)}
							showImpression={showImpression}
							showActionItem={showActionItem}
							truncateMemoContent={truncateMemoContent}
							index={index}
							className="[&>div>div]:max-w-full"
						/>
					</li>
				))}
			</MasonryInfiniteGrid>
		</section>
	);
};

export default MemoDateGroup;

/** 날짜 그룹의 메모와 카드 표시 설정. */
export interface IFMemoDateGroupProps extends LanguageType {
	/** `YYYY-MM-DD` 현지 날짜 키. 날짜를 알 수 없으면 `unknown` */
	dateKey: string;
	memos: GetMemoResponse[];
	highlightsByUrl: Map<string, HighlightRow[]>;
	sourcesByMemo: Map<number, HighlightMemoLink>;
	showImpression: boolean;
	showActionItem: boolean;
	truncateMemoContent: boolean;
	/** masonry 배치가 끝났을 때 그 그룹의 메모 id 목록(쉼표 구분)을 알린다 */
	onRenderComplete?: (dateKey: string, memoIds: string) => void;
}
