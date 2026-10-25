"use client";

import { Skeleton } from "@web-memo/ui";

/** 하이라이트 목록의 URL 제목과 인용문 한 열을 미리 보여준다. */
export function HighlightListSkeleton() {
	return (
		<div className="mx-auto flex w-full max-w-[840px] flex-col gap-7 sm:gap-8">
			{Array.from({ length: 3 }).map((_, index) => (
				<div key={index.toString()}>
					<div className="mb-3 flex items-center gap-2.5 sm:mb-3.5">
						<Skeleton className="size-6 rounded-md" />
						<div className="space-y-2">
							<Skeleton className="h-4 w-40" />
							<Skeleton className="h-3 w-24" />
						</div>
					</div>
					<div className="border-l-[3px] border-border pl-[14px] sm:pl-4">
						<Skeleton className="mb-3 h-5 w-full" />
						<Skeleton className="h-5 w-3/4" />
					</div>
				</div>
			))}
		</div>
	);
}
