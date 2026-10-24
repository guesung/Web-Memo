"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { useCategoryUpdateMutation } from "@web-memo/shared/hooks";
import type { CategoryRow } from "@web-memo/shared/types";
import { toast } from "@web-memo/ui";
import { useRef, useState } from "react";

/** 카테고리 이름 편집 세션과 저장 흐름을 관리한다. */
export default function useCategoryEditing({
	categories,
	lng,
}: UseCategoryEditingOptions) {
	const { t } = useTranslation(lng);
	const { mutateAsync: updateCategory } = useCategoryUpdateMutation();
	const [editingCategoryId, setEditingCategoryId] = useState<number | null>(
		null,
	);
	const editSessionRef = useRef(0);

	const startEditing = (categoryId: number) => {
		editSessionRef.current += 1;
		setEditingCategoryId(categoryId);
	};

	const cancelEditing = () => {
		editSessionRef.current += 1;
		setEditingCategoryId(null);
	};

	const submitRename = async (categoryId: number, newName: string) => {
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

	return { editingCategoryId, startEditing, cancelEditing, submitRename };
}

interface UseCategoryEditingOptions extends LanguageType {
	categories: CategoryRow[] | null | undefined;
}
