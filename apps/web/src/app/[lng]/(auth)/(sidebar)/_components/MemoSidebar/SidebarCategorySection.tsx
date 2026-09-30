"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { DEFAULT_CATEGORY_COLOR, PATHS } from "@web-memo/shared/constants";
import {
	useCategoryQuery,
	useCategoryUpdateMutation,
} from "@web-memo/shared/hooks";
import { useSearchParams } from "@web-memo/shared/modules/search-params";
import { cn } from "@web-memo/shared/utils";
import {
	Input,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	toast,
} from "@web-memo/ui";
import { SettingsIcon } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

import SidebarCategoryContextMenu from "./SidebarCategoryContextMenu";
import SidebarMenuItemAddCategory from "./SidebarMenuItemAddCategory";

/** 카테고리 탐색과 이름 변경 기능을 제공하는 섹션. */
const SidebarCategorySection = ({ lng }: LanguageType) => {
	const { t } = useTranslation(lng);
	const { categories } = useCategoryQuery();
	const { mutate: updateCategory } = useCategoryUpdateMutation();
	const searchParams = useSearchParams();
	const currentCategory = searchParams.get("category");

	const [editingCategoryId, setEditingCategoryId] = useState<number | null>(
		null,
	);
	const editInputRef = useRef<HTMLInputElement>(null);

	const handleRenameSubmit = (categoryId: number, newName: string) => {
		const trimmedName = newName.trim();
		if (!trimmedName) {
			setEditingCategoryId(null);
			return;
		}

		const isDuplicate = categories?.some(
			(c) =>
				c.id !== categoryId &&
				c.name.toLowerCase() === trimmedName.toLowerCase(),
		);

		if (isDuplicate) {
			toast({ title: t("toastTitle.duplicateCategory") });
			setEditingCategoryId(null);
			return;
		}

		const current = categories?.find((c) => c.id === categoryId);
		if (current?.name === trimmedName) {
			setEditingCategoryId(null);
			return;
		}

		updateCategory(
			{ id: categoryId, request: { name: trimmedName } },
			{ onSuccess: () => setEditingCategoryId(null) },
		);
	};

	return (
		<SidebarGroup id="category" className="p-0">
			<div className="flex items-center justify-between px-2">
				<SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					{t("sideBar.allCategory")}
				</SidebarGroupLabel>
				<Link
					href={`/${lng}${PATHS.memosSetting}`}
					className="rounded-md p-1.5 transition-colors hover:bg-accent"
					aria-label={t("sideBar.settings")}
				>
					<SettingsIcon
						size={14}
						className="text-muted-foreground transition-colors hover:text-foreground"
					/>
				</Link>
			</div>
			<SidebarGroupContent>
				<SidebarMenuItemAddCategory lng={lng} />
				<SidebarMenu className="gap-0">
					{categories?.map((category) => {
						const isActive = currentCategory === category.name;
						const categoryColor = category.color || DEFAULT_CATEGORY_COLOR;
						const isEditing = editingCategoryId === category.id;

						return (
							<SidebarMenuItem key={category.id}>
								<SidebarCategoryContextMenu
									category={category}
									lng={lng}
									onStartEditing={() => {
										setEditingCategoryId(category.id);
										setTimeout(() => editInputRef.current?.focus(), 50);
									}}
								>
									{isEditing ? (
										<div
											className="flex h-12 w-full items-center px-3"
											style={{ borderLeft: `3px solid ${categoryColor}` }}
										>
											<Input
												ref={editInputRef}
												defaultValue={category.name}
												autoFocus
												className="h-7 text-sm"
												onBlur={(e) =>
													handleRenameSubmit(category.id, e.target.value)
												}
												onKeyDown={(e) => {
													if (e.key === "Enter") {
														handleRenameSubmit(
															category.id,
															e.currentTarget.value,
														);
													}
													if (e.key === "Escape") {
														setEditingCategoryId(null);
													}
												}}
											/>
										</div>
									) : (
										// href에 lng를 붙이지 않으면 i18n 미들웨어가 307로 리다이렉트하고,
										// 그 RSC 요청은 하드 네비게이션으로 폴백돼 스크롤이 초기화된다.
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
											<Link
												href={{
													pathname: `/${lng}${PATHS.memos}`,
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
															isActive
																? "text-foreground"
																: "text-muted-foreground",
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
													style={
														isActive ? { backgroundColor: categoryColor } : {}
													}
												>
													{category.memo_count ?? 0}
												</span>
											</Link>
										</SidebarMenuButton>
									)}
								</SidebarCategoryContextMenu>
							</SidebarMenuItem>
						);
					})}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	);
};

export default SidebarCategorySection;
