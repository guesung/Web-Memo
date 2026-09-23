"use client";

import { Skeleton } from "@web-memo/ui";
import { useSearchParams } from "next/navigation";
import { MemoGridSkeleton } from "./MemoGrid";

/** 작성일별 메모를 읽는 동안 카드 그리드와 같은 배치로 표시하는 자리표시자. */
export const MemoListSkeleton = () => (
	<div className="mx-auto w-full max-w-[932px] space-y-3" aria-hidden="true">
		<Skeleton className="h-6 w-36" />
		<div className="flex flex-wrap gap-4">
			{Array.from({ length: 6 }, (_, index) => (
				<Skeleton
					key={index.toString()}
					className="h-[300px] w-[300px] rounded-2xl"
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
