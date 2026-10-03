"use client";

import LocalizedLink from "@src/components/LocalizedLink";
import type { LanguageType } from "@src/modules/i18n";
import { DEFAULT_CATEGORY_COLOR, PATHS } from "@web-memo/shared/constants";
import type { CategoryRow } from "@web-memo/shared/types";
import { cn } from "@web-memo/shared/utils";
import { SidebarMenuButton, SidebarMenuItem } from "@web-memo/ui";

import SidebarCategoryContextMenu from "./categoryContextMenu";
import SidebarCategoryNameInput from "./categoryNameInput";

/** 카테고리 한 행의 표시·메뉴·편집 상태를 담당한다. */
export default function SidebarCategoryItem({
	category,
	lng,
	isActive,
	isEditing,
	onStartEditing,
	onSubmit,
	onCancel,
}: SidebarCategoryItemProps) {
	const categoryColor = category.color || DEFAULT_CATEGORY_COLOR;

	return (
		<SidebarMenuItem>
			{isEditing ? (
				<div
					className="flex h-12 w-full items-center px-3"
					style={{ borderLeft: `3px solid ${categoryColor}` }}
				>
					<SidebarCategoryNameInput
						name={category.name}
						onSubmit={onSubmit}
						onCancel={onCancel}
					/>
				</div>
			) : (
				<SidebarCategoryContextMenu
					category={category}
					lng={lng}
					onStartEditing={onStartEditing}
				>
					<SidebarMenuButton
						asChild
						size="lg"
						className={cn(
							"group relative flex h-12 w-full items-center justify-between rounded-none px-3 transition-colors duration-200",
							"hover:shadow-sm",
							isActive
								? "bg-gradient-to-r shadow-sm"
								: "hover:bg-muted dark:hover:bg-muted/50",
						)}
						style={{
							borderLeft: `3px solid ${categoryColor}`,
							...(isActive && {
								backgroundImage: `linear-gradient(to right, ${categoryColor}15, ${categoryColor}08)`,
							}),
						}}
					>
						<LocalizedLink
							lng={lng}
							href={{
								pathname: PATHS.memos,
								query: { category: category.name },
							}}
							className="w-full"
							replace
						>
							<div className="flex items-center gap-3 flex-1 min-w-0">
								<div
									className="w-2 h-2 rounded-full flex-shrink-0 ring-2 ring-sidebar shadow-sm"
									style={{ backgroundColor: categoryColor }}
								/>
								<span
									className={cn(
										"font-medium truncate transition-colors",
										isActive ? "text-foreground" : "text-muted-foreground",
									)}
								>
									{category.name}
								</span>
							</div>
							<span
								className={cn(
									"flex items-center justify-center min-w-6 h-6 px-2 rounded-full text-xs font-semibold transition-all",
									isActive
										? "text-white shadow-sm"
										: "bg-muted text-muted-foreground",
								)}
								style={isActive ? { backgroundColor: categoryColor } : {}}
							>
								{category.memo_count ?? 0}
							</span>
						</LocalizedLink>
					</SidebarMenuButton>
				</SidebarCategoryContextMenu>
			)}
		</SidebarMenuItem>
	);
}

interface SidebarCategoryItemProps extends LanguageType {
	category: CategoryRow;
	isActive: boolean;
	isEditing: boolean;
	onStartEditing: () => void;
	onSubmit: (newName: string) => Promise<boolean>;
	onCancel: () => void;
}
