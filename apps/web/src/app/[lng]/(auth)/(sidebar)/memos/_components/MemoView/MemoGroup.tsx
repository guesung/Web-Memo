"use client";

import { MasonryInfiniteGrid } from "@egjs/react-infinitegrid";
import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import type {
	GetMemoResponse,
	HighlightMemoLink,
	HighlightRow,
} from "@web-memo/shared/types";
import { UNKNOWN_DOMAIN } from "./groupMemosByDomain";
import MemoItem from "./MemoItem";
import { restoreHeldScrollPosition } from "./scrollPositionHold";

/** 한 날짜 또는 도메인에 속한 메모를 왼쪽 그룹 열과 카드 masonry로 보여준다. */
const MemoGroup = ({
	lng,
	groupBy = "date",
	groupKey,
	memos,
	highlightsByUrl,
	sourcesByMemo,
	showImpression,
	showActionItem,
	truncateMemoContent,
	onRenderComplete,
}: IFMemoGroupProps) => {
	const { t } = useTranslation(lng);
	const dateFormatter = new Intl.DateTimeFormat(lng, { dateStyle: "long" });
	const weekdayFormatter = new Intl.DateTimeFormat(lng, { weekday: "long" });

	return (
		<section
			data-testid={`memo-${groupBy}-group`}
			aria-labelledby={`memo-${groupBy}-${groupKey}`}
			className="grid grid-cols-1 gap-4 md:grid-cols-[144px_minmax(0,1fr)] md:gap-6"
		>
			<h2
				data-testid={`memo-${groupBy}-label`}
				id={`memo-${groupBy}-${groupKey}`}
				className="min-w-0 border-b border-border pb-3 text-sm font-semibold [overflow-wrap:anywhere] md:border-b-0 md:border-r md:pb-0 md:pr-4"
			>
				{groupBy === "domain" ? (
					groupKey === UNKNOWN_DOMAIN ? (
						t("memos.view.unknownDomain")
					) : (
						groupKey
					)
				) : groupKey === "unknown" ? (
					t("memos.view.unknownDate")
				) : (
					<time
						dateTime={groupKey}
						className="flex flex-wrap items-baseline gap-x-2 gap-y-1 md:flex-col"
					>
						<span>
							{dateFormatter.format(new Date(`${groupKey}T00:00:00`))}
						</span>
						<span className="text-xs font-normal text-muted-foreground">
							{weekdayFormatter.format(new Date(`${groupKey}T00:00:00`))}
						</span>
					</time>
				)}
			</h2>
			<MasonryInfiniteGrid
				tag="ul"
				data-testid={`memo-${groupBy}-grid`}
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
						groupKey,
						event.items.map((item) => item.element?.dataset.memoId).join(","),
					);
				}}
			>
				{memos.map((memo, index) => (
					<li
						data-testid="memo-list-item"
						data-memo-id={memo.id}
						key={memo.id}
						data-grid-groupkey={groupKey}
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

export default MemoGroup;

/** 날짜·도메인 그룹의 메모와 카드 표시 설정. */
export interface IFMemoGroupProps extends LanguageType {
	/** 묶는 기준. 기본은 날짜 */
	groupBy?: "date" | "domain";
	/** 날짜면 `YYYY-MM-DD` 현지 날짜 키(알 수 없으면 `unknown`), 도메인이면 호스트명(알 수 없으면 빈 문자열) */
	groupKey: string;
	memos: GetMemoResponse[];
	highlightsByUrl: Map<string, HighlightRow[]>;
	sourcesByMemo: Map<number, HighlightMemoLink>;
	showImpression: boolean;
	showActionItem: boolean;
	truncateMemoContent: boolean;
	/** masonry 배치가 끝났을 때 그 그룹의 메모 id 목록(쉼표 구분)을 알린다 */
	onRenderComplete?: (groupKey: string, memoIds: string) => void;
}
