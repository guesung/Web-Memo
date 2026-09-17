import { Badge, Skeleton } from "@web-memo/ui";
import { HeartIcon } from "lucide-react";

export default function MemoFormSkeleton() {
	return (
		<form className="relative flex h-full flex-col gap-1 py-1">
			<div className="flex-1 resize-none text-sm outline-none border border-input bg-background rounded-md p-3">
				<div className="space-y-2">
					<Skeleton className="h-4" />
					<Skeleton className="h-4 w-3/4" />
					<Skeleton className="h-4 w-1/2" />
				</div>
			</div>

			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<HeartIcon
						size={16}
						className="cursor-pointer text-muted-foreground/50"
					/>
					<div className="flex items-center gap-1">
						<Skeleton className="size-3 rounded-full" />
						<Skeleton className="h-3 w-12" />
					</div>
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
