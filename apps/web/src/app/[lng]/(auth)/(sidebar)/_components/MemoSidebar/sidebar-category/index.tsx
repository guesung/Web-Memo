"use client";

import LocalizedLink from "@src/components/LocalizedLink";
import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { PATHS } from "@web-memo/shared/constants";
import {
	useCategoryQuery,
	useCategoryUpdateMutation,
} from "@web-memo/shared/hooks";
import { useSearchParams } from "@web-memo/shared/modules/search-params";
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	toast,
} from "@web-memo/ui";
import { SettingsIcon } from "lucide-react";
import { useRef, useState } from "react";
import SidebarMenuItemAddCategory from "./addCategory";
import SidebarCategoryItem from "./categoryItem";

/** 카테고리 목록과 한 번에 하나인 편집 세션을 관리하는 섹션. */
export default function SidebarCategorySection({ lng }: LanguageType) {
	const { t } = useTranslation(lng);
	const { categories } = useCategoryQuery();
	const { mutateAsync: updateCategory } = useCategoryUpdateMutation();
	const searchParams = useSearchParams();
	const currentCategory = searchParams.get("category");

	const [editingCategoryId, setEditingCategoryId] = useState<number | null>(
		null,
	);
	const editSessionRef = useRef(0);

	const handleStartEditing = (categoryId: number) => {
		editSessionRef.current += 1;
		setEditingCategoryId(categoryId);
	};

	const handleCancelEditing = () => {
		editSessionRef.current += 1;
		setEditingCategoryId(null);
	};

	const handleRenameSubmit = async (categoryId: number, newName: string) => {
		const editSession = editSessionRef.current;
		const finishEditing = () => {
			if (editSessionRef.current === editSession) {
				setEditingCategoryId(null);
			}
		};
		const trimmedName = newName.trim();
		if (!trimmedName) {
			finishEditing();
			return true;
		}

		const isDuplicate = categories?.some(
			(category) =>
				category.id !== categoryId &&
				category.name.toLowerCase() === trimmedName.toLowerCase(),
		);
		if (isDuplicate) {
			toast({ title: t("toastTitle.duplicateCategory") });
			finishEditing();
			return true;
		}

		const current = categories?.find((category) => category.id === categoryId);
		if (current?.name === trimmedName) {
			finishEditing();
			return true;
		}

		try {
			const result = await updateCategory({
				id: categoryId,
				request: { name: trimmedName },
			});
			if (result.error) {
				toast({ title: t("toastTitle.errorSave") });
				return false;
			}
		} catch {
			toast({ title: t("toastTitle.errorSave") });
			return false;
		}

		finishEditing();
		return true;
	};

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
							onStartEditing={() => handleStartEditing(category.id)}
							onSubmit={(newName) => handleRenameSubmit(category.id, newName)}
							onCancel={handleCancelEditing}
						/>
					))}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	);
}
