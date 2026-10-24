import { formatRelativeDate } from "@src/utils/formatRelativeDate";
import { getHostname } from "@src/utils/getHostname";
import { useQuery } from "@tanstack/react-query";
import { DEFAULT_CATEGORY_COLOR } from "@web-memo/shared/constants";
import {
	memoQueryOptions,
	useSettingQuery,
	useSupabaseClientQuery,
} from "@web-memo/shared/hooks";
import { I18n, Tab } from "@web-memo/shared/utils/extension";
import { Badge, Button, Skeleton } from "@web-memo/ui";
import { ChevronLeftIcon, ExternalLinkIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * 과거 메모(같은 글 알림에서 연 메모)를 사이드 패널 안에서 읽기 전용으로 보여 준다.
 * @description 삭제됐거나 불러오지 못하면 안내 문구와 함께 돌아가기·원래 페이지 열기를 남긴다.
 * 현재 사용처: MemoSection/index.tsx
 */
const PastMemoView = (props: IFPastMemoViewProps) => {
	const { data: supabaseClient } = useSupabaseClientQuery();
	const { showImpression, showActionItem } = useSettingQuery();
	const { data, isPending } = useQuery(
		memoQueryOptions({ supabaseClient, id: props.memoId }),
	);
	const memo = data?.data?.[0];

	const handleOpenOriginalClick = () => {
		void Tab.create({ url: props.url });
	};

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-2 py-1">
			<div className="flex shrink-0 items-center justify-between gap-2">
				<Button
					type="button"
					variant="ghost"
					className="h-auto gap-1 px-1 py-1 text-xs text-muted-foreground"
					onClick={props.onBackClick}
				>
					<ChevronLeftIcon className="size-4" aria-hidden="true" />
					{I18n.get("past_memo_view_back")}
				</Button>
				<span className="rounded-sm border px-1.5 py-0.5 text-xs text-muted-foreground">
					{I18n.get("past_memo_view_readonly")}
				</span>
			</div>
			{isPending ? (
				<PastMemoViewSkeleton />
			) : memo ? (
				<div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
					<h2 className="break-words text-sm font-semibold">
						{memo.title || props.title}
					</h2>
					<div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
						<span className="min-w-0 flex-1 truncate">
							{getHostname(memo.url)}
							{memo.updated_at && ` · ${formatRelativeDate(memo.updated_at)}`}
						</span>
						<OpenOriginalButton onClick={handleOpenOriginalClick} />
					</div>
					{memo.category && (
						<Badge variant="outline" className="w-fit items-center gap-1">
							<span
								className="size-2 shrink-0 rounded-full"
								style={{
									backgroundColor:
										memo.category.color || DEFAULT_CATEGORY_COLOR,
								}}
							/>
							<span className="max-w-32 truncate">{memo.category.name}</span>
						</Badge>
					)}
					<PastMemoSection label={I18n.get("memo")}>
						{memo.memo}
					</PastMemoSection>
					{showImpression && memo.impression && (
						<PastMemoSection label={I18n.get("impression")}>
							{memo.impression}
						</PastMemoSection>
					)}
					{showActionItem && memo.actionItem && (
						<PastMemoSection label={I18n.get("actionItem")}>
							{memo.actionItem}
						</PastMemoSection>
					)}
				</div>
			) : (
				<div className="flex flex-col items-start gap-2 text-xs text-muted-foreground">
					<p>{I18n.get("past_memo_view_load_failed")}</p>
					<OpenOriginalButton onClick={handleOpenOriginalClick} />
				</div>
			)}
		</div>
	);
};

export default PastMemoView;

const OpenOriginalButton = (props: { onClick: () => void }) => (
	<Button
		type="button"
		variant="link"
		className="h-auto shrink-0 gap-1 p-0 text-xs"
		onClick={props.onClick}
	>
		{I18n.get("past_memo_view_open_original")}
		<ExternalLinkIcon className="size-3" aria-hidden="true" />
	</Button>
);

const PastMemoSection = (props: { label: string; children: ReactNode }) => (
	<section className="flex flex-col gap-1">
		<h3 className="text-xs font-semibold text-muted-foreground">
			{props.label}
		</h3>
		<p className="whitespace-pre-wrap break-words text-sm">{props.children}</p>
	</section>
);

const PastMemoViewSkeleton = () => (
	<div className="flex flex-col gap-2" aria-busy="true">
		<Skeleton className="h-5 w-2/3" />
		<Skeleton className="h-3 w-1/2" />
		<Skeleton className="h-20 w-full" />
	</div>
);

/** PastMemoView props */
interface IFPastMemoViewProps {
	/** 보여 줄 과거 메모 id */
	memoId: number;
	/** 알림이 알려 준 메모 제목. 조회 결과에 제목이 없을 때 대신 쓴다 */
	title: string;
	/** 메모를 남긴 원래 페이지 URL */
	url: string;
	/** 이 페이지 메모로 돌아가기를 눌렀을 때 */
	onBackClick: () => void;
}
