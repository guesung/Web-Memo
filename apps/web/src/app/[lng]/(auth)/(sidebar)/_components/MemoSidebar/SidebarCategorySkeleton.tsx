import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuItem,
	Skeleton,
} from "@web-memo/ui";

/** 카테고리 슬롯의 크기와 위치를 유지하는 비대화형 대기 상태. */
export default function SidebarCategorySkeleton() {
	return (
		<SidebarGroup id="category" className="p-0" aria-busy="true">
			<div aria-hidden="true">
				<div className="flex h-8 items-center px-4">
					<SidebarGroupLabel className="p-0">
						<Skeleton className="h-3 w-16" />
					</SidebarGroupLabel>
				</div>
				<SidebarGroupContent>
					<div className="flex h-12 items-center px-3">
						<Skeleton className="h-4 w-28" />
					</div>
					<SidebarMenu className="gap-0">
						{[
							{ id: 1, width: "w-24" },
							{ id: 2, width: "w-28" },
							{ id: 3, width: "w-24" },
						].map(({ id, width }) => (
							<SidebarMenuItem key={id} className="flex h-8 items-center px-3">
								<Skeleton className={`h-3 ${width}`} />
							</SidebarMenuItem>
						))}
					</SidebarMenu>
				</SidebarGroupContent>
			</div>
		</SidebarGroup>
	);
}
