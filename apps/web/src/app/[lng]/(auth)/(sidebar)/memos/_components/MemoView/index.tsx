"use client";

import type { LanguageType } from "@src/modules/i18n";
import {
	getMemoNavigationId,
	reportMemoLoadStage,
	type TMemoLoadOutcome,
	type TMemoRoute,
} from "@src/modules/observability/client";
import { useMemosInfiniteQuery } from "@web-memo/shared/hooks";
import dynamic from "next/dynamic";
import { useEffect } from "react";
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

/** 라우트 필터에 해당하는 메모 목록과 검색 결과를 표시한다. */
const MemoView = ({ lng, filter }: IFMemoViewProps) => {
	if (filter === "plan") {
		return <PlanMemoView lng={lng} />;
	}

	return <PagedMemoView lng={lng} filter={filter} />;
};

export default MemoView;

/** 페이지 단위로 불러오는 메모 목록. 카드·작성일별·도메인별 보기를 전환한다. */
const PagedMemoView = ({ lng, filter }: IFPagedMemoViewProps) => {
	const { category, view, isListView, searchQuery } = useMemoSearchConditions();

	const {
		data,
		memos,
		totalCount,
		hasNextPage,
		isFetchingNextPage,
		fetchNextPage,
	} = useMemosInfiniteQuery({
		category,
		sortBy: view === "list" ? "created_at" : "updated_at",
		isWish: getWishlistFilter(filter),
		isStar: filter === "star" ? true : undefined,
		isReading: filter === "reading" ? true : undefined,
		searchQuery: searchQuery || undefined,
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
	const tabKey = `${category}|${filter}|${view}`;

	return (
		<MemoViewFrame
			lng={lng}
			memos={memos}
			totalCount={totalCount}
			isViewToggleVisible
		>
			{({ highlightsByUrl, sourcesByMemo }) => {
				const listProps = {
					lng,
					memos,
					highlightsByUrl,
					sourcesByMemo,
					searchQuery,
					hasNextPage,
					isFetchingNextPage,
					fetchNextPage,
					loadOutcome,
					route,
					navigationId,
				};

				return isListView ? (
					<MemoList
						key={tabKey}
						groupBy={view === "domain" ? "domain" : "date"}
						{...listProps}
					/>
				) : (
					<MemoGrid key={tabKey} {...listProps} />
				);
			}}
		</MemoViewFrame>
	);
};

/** 기본 목록에서는 위시 메모를 제외하고 별표·읽는 중에서는 위시 여부를 제한하지 않는다. */
const getWishlistFilter = (filter: TMemoFilter): boolean | undefined => {
	if (filter === "all") {
		return false;
	}

	if (filter === "wish") {
		return true;
	}

	return undefined;
};

/** 메모 목록의 언어와 라우트 필터. */
interface IFMemoViewProps extends LanguageType {
	/** 라우트가 정한 메모 범위 */
	filter: TMemoFilter;
}

/** 페이지 단위 목록의 언어와 라우트 필터. 읽을 계획은 PlanMemoView가 맡는다. */
interface IFPagedMemoViewProps extends LanguageType {
	filter: Exclude<TMemoFilter, "plan">;
}
