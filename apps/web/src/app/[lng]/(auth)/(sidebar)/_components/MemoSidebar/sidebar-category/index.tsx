"use client";

import LocalizedLink from "@src/components/LocalizedLink";
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
} from "@web-memo/ui";
import { SettingsIcon } from "lucide-react";
import SidebarMenuItemAddCategory from "./addCategory";
import SidebarCategoryItem from "./categoryItem";
import useCategoryEditing from "./useCategoryEditing";

/** 카테고리 목록과 메뉴를 조합하는 섹션. */
export default function SidebarCategorySection({ lng }: LanguageType) {
	const { t } = useTranslation(lng);
	const { categories } = useCategoryQuery();
	const searchParams = useSearchParams();
	const currentCategory = searchParams.get("category");
	const { editingCategoryId, startEditing, cancelEditing, submitRename } =
		useCategoryEditing({ categories, lng });

	return (
		<SidebarGroup id="category" className="p-0">
			<div className="flex items-center justify-between px-2">
				<SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					{t("sideBar.allCategory")}
				</SidebarGroupLabel>
				<LocalizedLink
					lng={lng}
					href={PATHS.memosSetting}
					className="rounded-md p-1.5 transition-colors hover:bg-accent"
					aria-label={t("sideBar.settings")}
				>
					<SettingsIcon
						size={14}
						className="text-muted-foreground transition-colors hover:text-foreground"
					/>
				</LocalizedLink>
			</div>
			<SidebarGroupContent>
				<SidebarMenuItemAddCategory lng={lng} />
				<SidebarMenu className="gap-0">
					{categories?.map((category) => (
						<SidebarCategoryItem
							key={category.id}
							category={category}
							lng={lng}
							isActive={currentCategory === category.name}
							isEditing={editingCategoryId === category.id}
							onStartEditing={() => startEditing(category.id)}
							onSubmit={(newName) => submitRename(category.id, newName)}
							onCancel={cancelEditing}
						/>
					))}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	);
}
