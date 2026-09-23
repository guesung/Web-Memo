"use client";

import { Skeleton } from "@web-memo/ui";
import { useSearchParams } from "next/navigation";
import { MemoGridSkeleton } from "./MemoGrid";

/** 작성일별 목록을 읽는 동안 표시할 행 자리표시자. */
export const MemoListSkeleton = () => (
	<div className="mx-auto w-full max-w-4xl space-y-3" aria-hidden="true">
		<Skeleton className="h-6 w-36" />
		{Array.from({ length: 6 }, (_, index) => (
			<Skeleton key={index.toString()} className="h-28 w-full rounded-xl" />
		))}
	</div>
);

/** URL의 보기 모드에 맞는 초기 로딩 모양을 표시한다. */
export const MemoViewSkeleton = () => {
	const searchParams = useSearchParams();

	return searchParams.get("view") === "list" ? (
		<MemoListSkeleton />
	) : (
		<MemoGridSkeleton />
	);
};
