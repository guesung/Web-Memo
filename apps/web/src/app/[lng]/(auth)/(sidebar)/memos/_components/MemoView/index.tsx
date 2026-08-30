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
	 * 탭이 바뀌면 목록을 맨 위에서 보여준다.
	 *
	 * @description 사이드바 탭은 searchParams만 바꾸는 같은 라우트 전환이라 Next가
	 * 스크롤을 맨 위로 올려주지 않는다. 그래서 스크롤을 내린 채 탭을 바꾸면 새 목록의
	 * 중간부터 보이거나, 목록이 짧아진 만큼 위치가 튄다.
	 * 의존성에 id(메모 다이얼로그)와 검색어는 넣지 않는다. 다이얼로그를 닫거나 검색어를
	 * 지웠을 때까지 맨 위로 올라가면 보던 자리를 잃는다.
	 */
	// biome-ignore lint/correctness/useExhaustiveDependencies: 탭 조합이 바뀔 때만 올려야 한다
	useEffect(
		function scrollToTopOnTabChange() {
			window.scrollTo(0, 0);
		},
		[category, isWishView, isStarView, isReadingView],
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
				lng={lng}
				memos={memos}
				hasNextPage={hasNextPage}
				isFetchingNextPage={isFetchingNextPage}
				fetchNextPage={fetchNextPage}
			/>
		</div>
	);
}
