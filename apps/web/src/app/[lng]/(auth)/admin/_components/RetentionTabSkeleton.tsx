import { Skeleton } from "@web-memo/ui";

/** 리텐션 탭이 로딩 중일 때 카드 한 장 높이를 미리 잡아 둔다. */
export default function RetentionTabSkeleton() {
	return <Skeleton className="h-[360px] w-full" aria-hidden />;
}
