"use client";

import { useGuide } from "@src/modules/guide";
import type { LanguageType } from "@src/modules/i18n";
import { useDidMount, useHighlightMemoLinks } from "@web-memo/shared/hooks";
import { bridge } from "@web-memo/shared/modules/extension-bridge";
import type {
	GetMemoResponse,
	HighlightMemoLink,
	HighlightRow,
} from "@web-memo/shared/types";
import { Loading, Skeleton } from "@web-memo/ui";
import dynamic from "next/dynamic";
import { type ReactNode, Suspense } from "react";
import { useTranslation } from "react-i18next";
import MemoDialog from "../MemoDialog";
import { useMemoDialog } from "./_hooks";
import { useMemoHighlights } from "./_hooks/useMemoHighlights";
import MemoViewToggle from "./MemoViewToggle";

/** 브라우저에서 설정을 읽는 토글을 지연 로딩한다. 인증 준비를 위한 Suspense는 유지한다. */
const MemoTruncateToggle = dynamic(() => import("./MemoTruncateToggle"), {
	ssr: false,
	loading: () => <Skeleton className="h-10 w-10" />,
});

const MemoRefreshButton = dynamic(() => import("./MemoRefreshButton"), {
	ssr: false,
	loading: () => <Skeleton className="h-10 w-10" />,
});

/**
 * 메모 목록 화면의 공통 틀. 개수·보기 도구, 하이라이트 로딩 오류, 메모 상세 다이얼로그를 맡는다.
 *
 * @description 목록 본문은 필터마다 데이터를 가져오는 방식이 달라(페이지 단위 / 한 번에 전부)
 * 호출부가 `children`으로 그린다. 하이라이트 연결 정보는 이 틀이 불러와 `children`에 넘긴다.
 */
const MemoViewFrame = ({
	lng,
	memos,
	totalCount,
	domain,
	domainFilter,
	isViewToggleVisible,
	children,
}: IFMemoViewFrameProps) => {
	const { t } = useTranslation(lng);
	const { dialogMemoId } = useMemoDialog();
	const { highlightsByUrl, isHighlightLoadError, refetchHighlights } =
		useMemoHighlights(memos.map((memo) => memo.url));
	const sources = useHighlightMemoLinks(
		memos.map((memo) => memo.id),
		"memo",
	);
	const sourcesByMemo = new Map(
		(sources.data ?? []).map((source) => [source.memo_id, source]),
	);

	const { moveNextGuideStep } = useGuide({ lng });
	useDidMount(async () => {
		try {
			await bridge.request.SYNC_LOGIN_STATUS();
		} catch {
			// 확장이 없거나 사이드 패널이 닫혀 수신자가 없으면 알릴 대상이 없으므로 무시한다.
		}
	});

	return (
		<div className="flex w-full flex-col gap-4">
			<div className="flex items-center">
				<div className="flex w-full flex-wrap items-center justify-between gap-2">
					<p className="text-muted-foreground select-none text-sm flex items-center gap-2">
						<span className="w-2 h-2 bg-primary rounded-full" />
						{domain
							? t("memos.domainFilter.totalMemos", {
									domain,
									total: totalCount,
								})
							: t("memos.totalMemos", { total: totalCount })}
					</p>
					<div className="flex flex-wrap items-center gap-2 max-sm:w-full">
						{domainFilter}
						{isViewToggleVisible && <MemoViewToggle lng={lng} />}
						<Suspense fallback={<Skeleton className="h-10 w-10" />}>
							<MemoTruncateToggle lng={lng} />
						</Suspense>
						<MemoRefreshButton lng={lng} onGuideNext={moveNextGuideStep} />
					</div>
				</div>
			</div>

			{isHighlightLoadError && (
				<div
					role="alert"
					className="flex items-center gap-2 text-sm text-destructive"
				>
					<p>{t("highlight.loadError")}</p>
					<button
						type="button"
						onClick={() => void refetchHighlights()}
						className="underline"
					>
						{t("error.500.retry")}
					</button>
				</div>
			)}
			{sources.isError && (
				<div
					role="alert"
					className="flex items-center gap-2 text-sm text-destructive"
				>
					<p>{t("highlight.memo.loadError")}</p>
					<button
						type="button"
						onClick={() => void sources.refetch()}
						className="underline"
					>
						{t("error.500.retry")}
					</button>
				</div>
			)}
			{children({ highlightsByUrl, sourcesByMemo })}
			{dialogMemoId && (
				<Suspense fallback={<Loading />}>
					<MemoDialog
						lng={lng}
						memoId={dialogMemoId}
						initialMemo={memos.find((memo) => memo.id === dialogMemoId)}
						{...getAdjacentMemoIds(memos, dialogMemoId)}
					/>
				</Suspense>
			)}
		</div>
	);
};

export default MemoViewFrame;

/**
 * 목록 순서에서 앞뒤 메모 id를 구한다.
 * @description 불러온 페이지 안에서만 찾는다. 끝에 닿으면 그 방향은 undefined다.
 */
function getAdjacentMemoIds(memos: { id: number }[], memoId: number) {
	const index = memos.findIndex((memo) => memo.id === memoId);
	if (index === -1) return {};

	return {
		prevMemoId: memos[index - 1]?.id,
		nextMemoId: memos[index + 1]?.id,
	};
}

/** 틀이 불러와 목록 본문에 넘기는 하이라이트 연결 정보. */
export interface IFMemoViewRelations {
	highlightsByUrl: Map<string, HighlightRow[]>;
	sourcesByMemo: Map<number, HighlightMemoLink>;
}

interface IFMemoViewFrameProps extends LanguageType {
	memos: GetMemoResponse[];
	totalCount: number;
	/** 정규화된 선택 도메인. 필터가 없으면 undefined */
	domain?: string;
	/** 보기 도구 앞에 놓는 도메인 선택 컨트롤 */
	domainFilter?: ReactNode;
	/** 카드·작성일별 보기 전환을 보여줄지 */
	isViewToggleVisible: boolean;
	children: (relations: IFMemoViewRelations) => ReactNode;
}
