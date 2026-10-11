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

/** 도메인 목록을 읽는 Suspense 쿼리라 클라이언트에서만 그리고, 메모 목록은 막지 않는다. */
const MemoDomainFilter = dynamic(() => import("./MemoDomainFilter"), {
	ssr: false,
	loading: () => <Skeleton className="h-10 w-28" />,
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
	isListControlsVisible,
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

	const totalMemosText = domain
		? t("memos.domainFilter.totalMemos", { domain, total: totalCount })
		: t("memos.totalMemos", { total: totalCount });

	return (
		<div className="flex w-full flex-col gap-4">
			<div className="flex items-center">
				<div className="flex w-full flex-wrap items-center justify-between gap-2">
					<p className="text-muted-foreground select-none text-sm flex items-center gap-2">
						<span className="w-2 h-2 bg-primary rounded-full" />
						{totalMemosText}
					</p>
					<div className="flex flex-wrap items-center gap-2 max-sm:w-full">
						{isListControlsVisible && (
							<>
								<Suspense fallback={<Skeleton className="h-10 w-28" />}>
									<MemoDomainFilter lng={lng} domain={domain} />
								</Suspense>
								<MemoViewToggle lng={lng} />
							</>
						)}
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
						key={dialogMemoId}
						lng={lng}
						memoId={dialogMemoId}
						initialMemo={memos.find((memo) => memo.id === dialogMemoId)}
					/>
				</Suspense>
			)}
		</div>
	);
};

export default MemoViewFrame;

/** 틀이 불러와 목록 본문에 넘기는 하이라이트 연결 정보. */
export interface IFMemoViewRelations {
	highlightsByUrl: Map<string, HighlightRow[]>;
	sourcesByMemo: Map<number, HighlightMemoLink>;
}

interface IFMemoViewFrameProps extends LanguageType {
	memos: GetMemoResponse[];
	totalCount: number;
	/** 정규화된 선택 도메인. 있으면 개수 문구가 도메인 기준이 된다 */
	domain?: string;
	/** 도메인 필터와 카드·작성일별·도메인별 보기 전환을 보여줄지 */
	isListControlsVisible: boolean;
	children: (relations: IFMemoViewRelations) => ReactNode;
}
