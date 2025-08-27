"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { PATHS } from "@web-memo/shared/constants";
import { useCategoryQuery } from "@web-memo/shared/hooks";
import { useSearchParams } from "@web-memo/shared/modules/search-params";
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@web-memo/ui";
import Link from "next/link";
import { memo } from "react";

export default memo(function SidebarGroupCategory({ lng }: LanguageType) {
	const { t } = useTranslation(lng);
	const { categories } = useCategoryQuery();
	const searchParams = useSearchParams();
	const currentCategory = searchParams.get("category");

	return (
		<SidebarGroup id="category">
			<SidebarGroupLabel>{t("sideBar.allCategory")}</SidebarGroupLabel>
			<SidebarGroupContent>
				<SidebarMenu>
					{categories?.map((category) => (
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
									className="flex w-full items-center justify-between rounded-md px-3 py-2"
									style={{
										borderLeft: `4px solid ${category.color || "transparent"}`,
										backgroundColor:
											currentCategory === category.name
												? category.color
													? `${category.color}20`
													: "bg-gray-100"
												: "transparent",
									}}
								>
									<span>{category.name}</span>
									<span className="text-xs text-slate-500 dark:text-slate-50">
										{category.memo_count ?? 0}
									</span>
								</SidebarMenuButton>
							</Link>
						</SidebarMenuItem>
					))}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	);
});
