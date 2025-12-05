"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { PATHS } from "@web-memo/shared/constants";
import { useCategoryQuery } from "@web-memo/shared/hooks";
import { useSearchParams } from "@web-memo/shared/modules/search-params";
import { cn } from "@web-memo/shared/utils";
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@web-memo/ui";
import { SettingsIcon } from "lucide-react";
import Link from "next/link";
import { memo } from "react";

export default memo(function SidebarGroupCategory({ lng }: LanguageType) {
	const { t } = useTranslation(lng);
	const { categories } = useCategoryQuery();
	const searchParams = useSearchParams();
	const currentCategory = searchParams.get("category");

	return (
		<SidebarGroup id="category" className="px-2">
			<div className="flex items-center justify-between mb-3 px-2">
				<SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
					{t("sideBar.allCategory")}
				</SidebarGroupLabel>
				<Link href={PATHS.memosSetting}>
					<button
						type="button"
						className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800 transition-all duration-200 hover:scale-110 active:scale-95"
						aria-label="Category settings"
					>
						<SettingsIcon size={14} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors" />
					</button>
				</Link>
			</div>
			<SidebarGroupContent>
				<SidebarMenu className="space-y-1">
					{categories?.map((category) => {
						const isActive = currentCategory === category.name;
						const categoryColor = category.color || "#9333ea";

						return (
							<SidebarMenuItem key={category.id}>
								<Link
									href={{
										pathname: PATHS.memos,
										query: { category: category.name },
									}}
									className="w-full"
									replace
								>
									<SidebarMenuButton
										className={cn(
											"group relative flex w-full items-center justify-between rounded-lg px-3 py-2.5 transition-all duration-200",
											"hover:shadow-sm hover:scale-[1.02] active:scale-[0.98]",
											isActive
												? "bg-gradient-to-r shadow-sm scale-[1.02]"
												: "hover:bg-gray-100 dark:hover:bg-gray-800/50"
										)}
										style={{
											borderLeft: `3px solid ${categoryColor}`,
											...(isActive && {
												backgroundImage: `linear-gradient(to right, ${categoryColor}15, ${categoryColor}08)`,
											}),
										}}
									>
										<div className="flex items-center gap-3 flex-1 min-w-0">
											<div
												className="w-2 h-2 rounded-full flex-shrink-0 ring-2 ring-white dark:ring-gray-900 shadow-sm"
												style={{ backgroundColor: categoryColor }}
											/>
											<span className={cn(
												"font-medium truncate transition-colors",
												isActive
													? "text-gray-900 dark:text-white"
													: "text-gray-600 dark:text-gray-300"
											)}>
												{category.name}
											</span>
										</div>
										<span
											className={cn(
												"flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full text-xs font-semibold transition-all",
												isActive
													? "text-white shadow-sm"
													: "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
											)}
											style={isActive ? { backgroundColor: categoryColor } : {}}
										>
											{category.memo_count ?? 0}
										</span>
									</SidebarMenuButton>
								</Link>
							</SidebarMenuItem>
						);
					})}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	);
});
