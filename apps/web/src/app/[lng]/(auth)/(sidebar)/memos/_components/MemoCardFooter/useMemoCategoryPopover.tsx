import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import {
	useCategoryPostMutation,
	useCategoryQuery,
	useMemoPatchMutation,
} from "@web-memo/shared/hooks";
import { useSearchParams } from "@web-memo/shared/modules/search-params";
import type { CategoryRow, GetMemoResponse } from "@web-memo/shared/types";
import { generateRandomPastelColor } from "@web-memo/shared/utils";
import { ToastAction, toast } from "@web-memo/ui";
import { useRouter } from "next/navigation";
import { type RefObject, useRef, useState } from "react";

interface IFUseMemoCategoryPopoverProps extends LanguageType {
	memo: GetMemoResponse;
	/** 칩이 다시 나타났을 때 포커스를 보낼 칩 ref */
	chipRef: RefObject<HTMLButtonElement | null>;
}

/**
 * 메모 카드 하나의 카테고리 팝업 상태와 저장 로직
 * @description 선택·만들기·해제와 그 토스트(이동하기·되돌리기·실패)를 맡는다.
 * 사용처: MemoCardFooter/index.tsx
 */
export default function useMemoCategoryPopover({
	lng,
	memo,
	chipRef,
}: IFUseMemoCategoryPopoverProps) {
	const { t } = useTranslation(lng);
	const searchParams = useSearchParams();
	const router = useRouter();
	const { categories } = useCategoryQuery();
	const { mutateAsync: patchMemo } = useMemoPatchMutation();
	const { mutateAsync: createCategory, isPending: isCategoryCreating } =
		useCategoryPostMutation();
	const [isOpen, setIsOpen] = useState(false);
	// 닫히는 애니메이션 동안에도 위치를 잡아야 해서 닫아도 비우지 않는다.
	const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);
	const shouldFocusChipOnCloseRef = useRef(false);

	const currentCategoryId = memo.category_id;

	const open = (anchor: HTMLElement) => {
		setAnchorElement(anchor);
		setIsOpen(true);
	};

	const showFailureToast = (titleKey: string) => {
		toast({ title: t(titleKey), variant: "destructive" });
	};

	const patchCategory = async (categoryId: number | null) => {
		try {
			await patchMemo({
				id: memo.id,
				request: { category_id: categoryId },
				categorySource: "button",
			});
			return true;
		} catch {
			showFailureToast("toastTitle.categoryEditFailed");
			return false;
		}
	};

	const assignCategory = async (category: Pick<CategoryRow, "id" | "name">) => {
		if (category.id === currentCategoryId) {
			setIsOpen(false);
			return;
		}

		const isSaved = await patchCategory(category.id);
		if (!isSaved) return;

		setIsOpen(false);
		toast({
			title: t("toastTitle.categoryEdited"),
			action: (
				<ToastAction
					altText={t("toastActionMessage.goTo")}
					onClick={() => {
						searchParams.set("category", category.name);
						router.push(searchParams.getUrl());
					}}
				>
					{t("toastActionMessage.goTo")}
				</ToastAction>
			),
		});
	};

	const handleCategoryCreate = async (categoryName: string) => {
		if (isCategoryCreating) return;

		let createdCategory: CategoryRow | undefined;
		try {
			const result = await createCategory({
				name: categoryName,
				color: generateRandomPastelColor(),
			});
			createdCategory = result.data?.[0];
		} catch {
			showFailureToast("toastTitle.categoryCreateFailed");
			return;
		}
		if (!createdCategory) {
			showFailureToast("toastTitle.categoryCreateFailed");
			return;
		}

		// 지정이 실패해도 만든 카테고리는 남긴다(롤백하지 않는다).
		await assignCategory(createdCategory);
	};

	const handleCategoryRemove = async () => {
		const previousCategoryId = currentCategoryId;
		const isSaved = await patchCategory(null);
		if (!isSaved) return;

		shouldFocusChipOnCloseRef.current = true;
		setIsOpen(false);
		toast({
			title: t("toastTitle.categoryRemoved"),
			action: (
				<ToastAction
					altText={t("toastActionMessage.undo")}
					onClick={() => {
						patchCategory(previousCategoryId);
					}}
				>
					{t("toastActionMessage.undo")}
				</ToastAction>
			),
		});
	};

	/** 닫히면 포커스를 트리거로 돌린다. 해제했다면 새로 그려진 칩으로 보낸다. */
	const handleCloseAutoFocus = (event: Event) => {
		event.preventDefault();

		const focusTarget = shouldFocusChipOnCloseRef.current
			? chipRef.current
			: anchorElement;
		shouldFocusChipOnCloseRef.current = false;
		if (focusTarget?.isConnected) {
			focusTarget.focus();
		}
	};

	return {
		isOpen,
		anchorElement,
		categories,
		currentCategoryId,
		isCategoryCreating,
		open,
		handleOpenChange: setIsOpen,
		handleCategorySelect: assignCategory,
		handleCategoryCreate,
		handleCategoryRemove,
		handleCloseAutoFocus,
	};
}
