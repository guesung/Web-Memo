import { Skeleton } from "@web-memo/ui";

/** 초기 목록, 날짜별 목록과 추가 로딩에서 짧은 메모 카드의 공간을 확보한다. */
export const MemoItemSkeleton = () => (
	<div
		className="w-[300px] max-w-full rounded-2xl border border-border bg-card"
		aria-hidden="true"
	>
		<div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
			<Skeleton className="size-5 shrink-0 rounded" />
			<Skeleton className="h-5 w-40" />
		</div>
		<div className="px-4 py-2">
			<Skeleton className="h-6 w-full" />
		</div>
		<div className="flex items-center justify-between border-t border-border px-4 py-2">
			<div className="flex flex-col gap-2">
				<Skeleton className="h-6 w-20 rounded-full" />
				<Skeleton className="h-4 w-16" />
			</div>
			<div className="flex gap-1">
				{Array.from({ length: 4 }, (_, index) => (
					<Skeleton key={index.toString()} className="size-8 rounded-full" />
				))}
			</div>
		</div>
	</div>
);
