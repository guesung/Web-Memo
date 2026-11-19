import { Skeleton } from "@web-memo/ui";
import { GA_CORE_METRICS } from "../_constants";

/** GA 지표 섹션이 로딩 중일 때 실제 배치(그래프·카드 그리드·표)와 같은 모양으로 채운다. */
export default function GaMetricsSkeleton() {
	return (
		<div className="flex flex-col gap-6" aria-hidden>
			<Skeleton className="h-[330px] w-full" />
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{GA_CORE_METRICS.slice(0, 8).map(({ key }) => (
					<Skeleton key={key} className="h-[150px] w-full" />
				))}
			</div>
		</div>
	);
}
