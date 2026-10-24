"use client";

import type { LanguageType } from "@src/modules/i18n";
import {
	getMemoNavigationId,
	reportMemoLoadStage,
	type TMemoLoadOutcome,
	type TMemoRoute,
} from "@src/modules/observability/client";
import { useMemosInfiniteQuery } from "@web-memo/shared/hooks";
import { parseDomainFilter } from "@web-memo/shared/utils";
import { Skeleton } from "@web-memo/ui";
import dynamic from "next/dynamic";
import { Suspense, useEffect } from "react";
import type { TMemoFilter } from "../../_types";
import { useMemoSearchConditions } from "./_hooks";
import MemoGrid from "./MemoGrid";
import { MemoListSkeleton } from "./MemoListSkeleton";
import MemoViewFrame from "./MemoViewFrame";
import PlanMemoView from "./PlanMemoView";

/** 현지 날짜는 브라우저에서 계산하여 서버 시간대의 영향을 받지 않는다. */
const MemoList = dynamic(() => import("./MemoList"), {
	ssr: false,
	loading: () => <MemoListSkeleton />,
});

/** 도메인 목록을 읽는 Suspense 쿼리라 클라이언트에서만 그리고, 메모 목록은 막지 않는다. */
const MemoDomainFilter = dynamic(() => import("./MemoDomainFilter"), {
	ssr: false,
	loading: () => <Skeleton className="h-10 w-28" />,
});

/** 라우트 필터에 해당하는 메모 목록과 검색 결과를 표시한다. */
const MemoView = ({ lng, filter }: IFMemoViewProps) => {
	if (filter === "plan") {
		return <PlanMemoView lng={lng} />;
	}

	return <PagedMemoView lng={lng} filter={filter} />;
};

export default MemoView;

/** 페이지 단위로 불러오는 메모 목록. 카드 보기와 작성일별 보기를 전환한다. */
const PagedMemoView = ({ lng, filter }: IFPagedMemoViewProps) => {
	const { category, isListView, searchQuery, domainParam } =
		useMemoSearchConditions();
	const domain = parseDomainFilter(domainParam);
	const isWish = getWishlistFilter(filter);
	const isStar = filter === "star" ? true : undefined;
	const isReading = filter === "reading" ? true : undefined;

	const {
		data,
		memos,
		totalCount,
		hasNextPage,
		isFetchingNextPage,
		fetchNextPage,
	} = useMemosInfiniteQuery({
		category,
		sortBy: isListView ? "created_at" : "updated_at",
		isWish,
		isStar,
		isReading,
		searchQuery: searchQuery || undefined,
		domain,
	});
	const loadOutcome: TMemoLoadOutcome = data.pages[0]?.error
		? "error"
		: memos.length === 0
			? "empty"
			: "success";
	const route: TMemoRoute = filter === "all" ? "/memos" : `/memos/${filter}`;
	const navigationId = getMemoNavigationId(route);
	useEffect(() => {
		reportMemoLoadStage({
			route,
			navigationId,
			stage: "data_ready",
			outcome: loadOutcome,
		});
	}, [route, navigationId, loadOutcome]);

	/**
	 * 현재 탭을 식별하는 키. MemoGrid를 탭마다 리마운트시키는 데 쓴다.
	 *
	 * @description egjs InfiniteGrid는 목록이 바뀌면 직전에 보던 영역을 계속 보이게
	 * 하려고 스크롤을 보정한다(infinitegrid.esm.js의 renderComplete 직전 scrollBy).
	 * 스크롤 주체가 문서가 된 뒤로는 그 보정이 window를 움직여, 탭을 바꾸면 목록이
	 * 아래로 끌려 내려간다. key로 리마운트하면 보정할 이전 상태 자체가 없어진다.
	 * 검색어와 id(메모 다이얼로그)는 넣지 않는다. 넣으면 글자를 칠 때마다,
	 * 다이얼로그를 여닫을 때마다 그리드가 통째로 다시 그려진다.
	 */
	const tabKey = `${category}|${filter}|${isListView}|${domain ?? ""}`;
	const ListComponent = isListView ? MemoList : MemoGrid;

	return (
		<MemoViewFrame
			lng={lng}
			memos={memos}
			totalCount={totalCount}
			domain={domain}
			domainFilter={
				<Suspense fallback={<Skeleton className="h-10 w-28" />}>
					<MemoDomainFilter
						lng={lng}
						domain={domain}
						category={category}
						isWish={isWish}
						isStar={isStar}
						isReading={isReading}
					/>
				</Suspense>
			}
			isViewToggleVisible
		>
			{({ highlightsByUrl, sourcesByMemo }) => (
				<ListComponent
					key={tabKey}
					lng={lng}
					memos={memos}
					highlightsByUrl={highlightsByUrl}
					sourcesByMemo={sourcesByMemo}
					searchQuery={searchQuery}
					domain={domain}
					hasNextPage={hasNextPage}
					isFetchingNextPage={isFetchingNextPage}
					fetchNextPage={fetchNextPage}
					loadOutcome={loadOutcome}
					route={route}
					navigationId={navigationId}
				/>
			)}
		</MemoViewFrame>
	);
};

/** 위시 탭만 위시 메모를 보여주고, 그 외 탭(별표·읽는 중 포함)은 위시 메모를 제외해 검색도 현재 탭 안에서만 한다. */
const getWishlistFilter = (filter: TMemoFilter): boolean => filter === "wish";

/** 메모 목록의 언어와 라우트 필터. */
interface IFMemoViewProps extends LanguageType {
	/** 라우트가 정한 메모 범위 */
	filter: TMemoFilter;
}

/** 페이지 단위 목록의 언어와 라우트 필터. 읽을 계획은 PlanMemoView가 맡는다. */
interface IFPagedMemoViewProps extends LanguageType {
	filter: Exclude<TMemoFilter, "plan">;
}
