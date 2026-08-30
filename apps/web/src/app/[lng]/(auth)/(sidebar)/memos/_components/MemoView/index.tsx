"use client";

import { useGuide } from "@src/modules/guide";
import type { LanguageType } from "@src/modules/i18n";
import { useDidMount, useMemosInfiniteQuery } from "@web-memo/shared/hooks";
import { bridge } from "@web-memo/shared/modules/extension-bridge";
import { Skeleton } from "@web-memo/ui";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { SearchFormValues } from "../MemoSearchFormProvider";
import MemoGrid from "./MemoGrid";

const MemoRefreshButton = dynamic(() => import("./MemoRefreshButton"), {
	ssr: false,
	loading: () => <Skeleton className="h-10 w-10" />,
});

export default function MemoView({ lng }: LanguageType) {
	const { t } = useTranslation(lng);
	const { watch } = useFormContext<SearchFormValues>();
	const searchParams = useSearchParams();

	const category = searchParams.get("category") ?? "";
	const isWishView = searchParams.get("isWish") === "true";
	const isStarView = searchParams.get("isStar") === "true";
	const isReadingView = searchParams.get("isReading") === "true";
	const searchQuery = watch("searchQuery");

	const { memos, totalCount, hasNextPage, isFetchingNextPage, fetchNextPage } =
		useMemosInfiniteQuery({
			category,
			isWish: isStarView || isReadingView ? undefined : isWishView,
			isStar: isStarView ? true : undefined,
			isReading: isReadingView ? true : undefined,
			searchQuery: searchQuery || undefined,
		});

	useGuide({ lng });
	useDidMount(() => bridge.request.SYNC_LOGIN_STATUS());

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
	const tabKey = `${category}|${isWishView}|${isStarView}|${isReadingView}`;

	/**
	 * 탭이 바뀌면 목록을 맨 위에서 보여준다.
	 *
	 * @description 사이드바 탭은 searchParams만 바꾸는 같은 라우트 전환이라 Next가
	 * 스크롤을 맨 위로 올려주지 않는다. 위의 리마운트만으로는 이미 내려가 있던 문서
	 * 스크롤이 그대로 남으므로 여기서 직접 올린다. 둘 다 필요하다 - 이것만 있으면
	 * egjs 보정이 곧바로 덮어쓰고, 리마운트만 있으면 이전 스크롤이 남는다.
	 */
	// biome-ignore lint/correctness/useExhaustiveDependencies: 탭이 바뀔 때만 올려야 한다
	useEffect(
		function scrollToTopOnTabChange() {
			window.scrollTo(0, 0);
		},
		[tabKey],
	);

	return (
		<div className="flex w-full flex-col gap-4">
			<div className="flex items-center">
				<div className="flex w-full items-center justify-between">
					<p className="text-muted-foreground select-none text-sm flex items-center gap-2">
						<span className="w-2 h-2 bg-primary rounded-full" />
						{t("memos.totalMemos", { total: totalCount })}
					</p>
					<div className="flex">
						<MemoRefreshButton lng={lng} />
					</div>
				</div>
			</div>

			<MemoGrid
				key={tabKey}
				lng={lng}
				memos={memos}
				hasNextPage={hasNextPage}
				isFetchingNextPage={isFetchingNextPage}
				fetchNextPage={fetchNextPage}
			/>
		</div>
	);
}
