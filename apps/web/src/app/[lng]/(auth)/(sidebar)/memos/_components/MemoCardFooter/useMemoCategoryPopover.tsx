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
import { useRef, useState } from "react";

/** 팝업이 붙을 기준. 배지·⋮ 버튼이거나, 본문 # 경로에서는 커서 위치의 가상 사각형이다 */
export interface IFCategoryPopoverAnchor {
	getBoundingClientRect: () => DOMRect;
}

/** 본문 # 입력으로 열 때 넘기는 동작 */
interface IFHashOpenOptions {
	/** 카테고리를 고르면 본문에 넣은 #을 지운다. 저장보다 먼저 부른다 */
	onSelect: () => void;
	/** 닫히면 포커스를 본문 커서 자리로 돌린다 */
	restoreFocus: () => void;
}

interface IFUseMemoCategoryPopoverProps extends LanguageType {
	memo: GetMemoResponse;
}

/**
 * 메모 하나의 카테고리 팝업 상태와 저장 로직
 * @description 선택·만들기·해제와 그 토스트(이동하기·되돌리기·실패)를 맡는다.
 * 배지·⋮ 버튼 경로와 본문 # 경로가 같은 팝업을 쓴다.
 * 사용처: MemoCardFooter/index.tsx, MemoDialog/index.tsx
 */
export default function useMemoCategoryPopover({
	lng,
	memo,
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
	const [anchor, setAnchor] = useState<IFCategoryPopoverAnchor | null>(null);
	const hashOptionsRef = useRef<IFHashOpenOptions | null>(null);

	const currentCategoryId = memo.category_id;

	const open = (nextAnchor: HTMLElement) => {
		hashOptionsRef.current = null;
		setAnchor(nextAnchor);
		setIsOpen(true);
	};

	const openFromHash = (
		nextAnchor: IFCategoryPopoverAnchor,
		options: IFHashOpenOptions,
	) => {
		hashOptionsRef.current = options;
		setAnchor(nextAnchor);
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
				categorySource: hashOptionsRef.current ? "hash" : "button",
			});
			return true;
		} catch {
			showFailureToast("toastTitle.categoryEditFailed");
			return false;
		}
	};

	const assignCategory = async (category: Pick<CategoryRow, "id" | "name">) => {
		hashOptionsRef.current?.onSelect();

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

	/**
	 * 닫히면 포커스를 연 자리로 돌린다. 버튼 경로는 트리거로(해제로 배지가 사라졌으면 생략),
	 * # 경로는 본문 커서 자리로 보낸다.
	 */
	const handleCloseAutoFocus = (event: Event) => {
		event.preventDefault();

		if (hashOptionsRef.current) {
			hashOptionsRef.current.restoreFocus();
			return;
		}

		if (anchor instanceof HTMLElement && anchor.isConnected) {
			anchor.focus();
		}
	};

	return {
		isOpen,
		anchor,
		categories,
		currentCategoryId,
		isCategoryCreating,
		open,
		openFromHash,
		handleOpenChange: setIsOpen,
		handleCategorySelect: assignCategory,
		handleCategoryCreate,
		handleCategoryRemove,
		handleCloseAutoFocus,
	};
}

/** 푸터·모달이 주고받는 카테고리 팝업 상태 */
export type TMemoCategoryPopover = ReturnType<typeof useMemoCategoryPopover>;
