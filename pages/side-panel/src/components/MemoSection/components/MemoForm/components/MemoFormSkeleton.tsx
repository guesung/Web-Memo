import { Badge, Skeleton } from "@web-memo/ui";
import { BookOpenIcon, HeartIcon, StarIcon } from "lucide-react";

/**
 * MemoForm이 뜨기 전(user·setting·category 대기) 자리를 채우는 뼈대.
 * @description 실제 MemoForm과 같은 레이아웃 클래스(제목 줄 h-8·본문 칸 flex-1·하단
 * 버튼 줄)를 써서, 데이터가 도착해 실제 폼으로 바뀔 때 세로 위치가 움직이지 않게 한다.
 */
export default function MemoFormSkeleton() {
	return (
		<form className="relative flex min-h-0 flex-1 flex-col py-1">
			<div className="mb-1 flex h-8 shrink-0 items-center gap-1">
				<Skeleton className="h-4 w-1/3" />
			</div>
			<div className="flex min-h-0 flex-1 flex-col">
				<div className="min-h-0 flex-1 space-y-2 rounded-md border border-input bg-background p-3">
					<Skeleton className="h-4" />
					<Skeleton className="h-4 w-3/4" />
					<Skeleton className="h-4 w-1/2" />
				</div>
			</div>
			<div className="flex shrink-0 items-center justify-between gap-2 pt-2">
				<div className="flex items-center gap-2">
					<HeartIcon size={16} className="text-muted-foreground/50" />
					<StarIcon size={16} className="text-muted-foreground/50" />
					<BookOpenIcon size={16} className="text-muted-foreground/50" />
				</div>
				<Badge
					variant="outline"
					className="flex items-center gap-1 px-2 py-0.5 opacity-50"
				>
					<Skeleton className="size-2 rounded-full" />
					<Skeleton className="h-3 w-16" />
				</Badge>
			</div>
		</form>
	);
}
