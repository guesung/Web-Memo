"use client";

import { Skeleton } from "@web-memo/ui";

/** 하이라이트 목록 로딩 중 보여주는 스켈레톤. HighlightGroupCard 모양을 흉내낸다 */
export function HighlightListSkeleton() {
	return (
		<div className="flex flex-col gap-4">
			{Array.from({ length: 3 }).map((_, index) => (
				<div
					key={index.toString()}
					className="rounded-xl border border-border bg-card p-4"
				>
					<Skeleton className="mb-3 h-4 w-40" />
					<div className="flex flex-col gap-3 py-2">
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-3/4" />
					</div>
				</div>
			))}
		</div>
	);
}
