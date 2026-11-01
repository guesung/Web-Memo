"use client";

import { Skeleton } from "@web-memo/ui";

const SKELETON_ROW_COUNT = 5;

/** 즐겨찾기 목록 로딩 중 보여주는 스켈레톤. FavoriteItem 행 모양을 흉내낸다 */
export function FavoriteListSkeleton() {
	return (
		<div className="divide-y divide-border rounded-xl border border-border bg-card">
			{Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
				<div
					key={index.toString()}
					className="flex items-center gap-3 px-4 py-3"
				>
					<Skeleton className="size-4 shrink-0 rounded" />
					<div className="flex flex-col gap-1.5">
						<Skeleton className="h-4 w-48" />
						<Skeleton className="h-3 w-24" />
					</div>
				</div>
			))}
		</div>
	);
}
