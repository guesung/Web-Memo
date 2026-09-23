"use client";

import { Skeleton } from "@web-memo/ui";
import { useSearchParams } from "next/navigation";
import { MemoGridSkeleton } from "./MemoGrid";

/** 작성일별 메모를 읽는 동안 카드 그리드와 같은 배치로 표시하는 자리표시자. */
export const MemoListSkeleton = () => (
	<div
		className="mx-auto grid w-full max-w-[1124px] grid-cols-1 gap-4 md:grid-cols-[144px_minmax(0,1fr)] md:gap-6"
		aria-hidden="true"
	>
		<div className="flex gap-2 border-b border-border pb-3 md:flex-col md:border-b-0 md:border-r md:pb-0 md:pr-4">
			<Skeleton className="h-5 w-28" />
			<Skeleton className="h-4 w-12" />
		</div>
		<div className="flex min-w-0 max-w-[300px] flex-wrap gap-4 md:max-w-none">
			{Array.from({ length: 6 }, (_, index) => (
				<Skeleton
					key={index.toString()}
					className="h-[300px] w-[300px] max-w-full rounded-2xl"
				/>
			))}
		</div>
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
