import type { MemoInput } from "@src/types/Input";
import { useCategoryQuery } from "@web-memo/shared/hooks";
import type { TCategoryChangeSource } from "@web-memo/shared/modules/analytics";
import type { CategoryRow } from "@web-memo/shared/types";
import { getCursorPosition } from "@web-memo/shared/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";

const CATEGORY_LIST_WIDTH = 256;

interface UseMemoCategoryProps {
	textareaRef: React.RefObject<HTMLTextAreaElement | null>;
	onCategoryChange: (
		categoryId: number | null,
		source: TCategoryChangeSource,
	) => void;
}

export default function useMemoCategory({
	textareaRef,
	onCategoryChange,
}: UseMemoCategoryProps) {
	const { watch, setValue, getValues } = useFormContext<MemoInput>();
	const { categories, refetch: refetchCategories } = useCategoryQuery();
	const [categoryPopupOpenSource, setCategoryPopupOpenSource] =
		useState<TCategoryPopupOpenSource | null>(null);
	const [categoryInputPosition, setCategoryInputPosition] =
		useState<TCategoryPopupPosition>({ top: 0, left: 0 });
	const commandInputRef = useRef<HTMLInputElement>(null);
	const categoryPopupRef = useRef<HTMLDivElement>(null);
	const categoryBadgeButtonRef = useRef<HTMLButtonElement>(null);
	const categoryAddChipRef = useRef<HTMLButtonElement>(null);
	const categoryPopupTriggerRef = useRef<HTMLElement | null>(null);
	const cursorPositionRef = useRef<number | null>(null);

	const restoreFocus = useCallback(() => {
		if (textareaRef.current) {
			textareaRef.current.focus();
			if (cursorPositionRef.current !== null) {
				textareaRef.current.setSelectionRange(
					cursorPositionRef.current,
					cursorPositionRef.current,
				);
			}
		}
	}, [textareaRef]);

	useEffect(
		function closeButtonPopupOnOutsidePointerDown() {
			if (categoryPopupOpenSource !== "button") {
				return;
			}

			const handleDocumentPointerDown = (event: PointerEvent) => {
				if (!(event.target instanceof Node)) {
					return;
				}

				const isInsidePopup = categoryPopupRef.current?.contains(event.target);
				// 트리거를 다시 누른 경우는 트리거의 클릭 핸들러가 닫는다. 여기서도 닫으면 곧바로 다시 열린다.
				const isOnTrigger = categoryPopupTriggerRef.current?.contains(
					event.target,
				);

				if (isInsidePopup || isOnTrigger) {
					return;
				}

				setCategoryPopupOpenSource(null);
				categoryPopupTriggerRef.current?.focus();
			};

			document.addEventListener("pointerdown", handleDocumentPointerDown);

			return () => {
				document.removeEventListener("pointerdown", handleDocumentPointerDown);
			};
		},
		[categoryPopupOpenSource],
	);

	const openCategoryPopup = (source: TCategoryPopupOpenSource) => {
		setCategoryPopupOpenSource(source);

		// 웹에서 카테고리를 막 만들고 돌아왔을 수 있다. 캐시가 비어 있을 때만 다시 받는다.
		const hasNoCategories = !categories?.length;
		if (hasNoCategories) {
			refetchCategories();
		}

		setTimeout(() => {
			commandInputRef.current?.focus();
		}, 0);
	};

	const closeButtonPopup = () => {
		setCategoryPopupOpenSource(null);
		categoryPopupTriggerRef.current?.focus();
	};

	const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (event.key !== "#") return;

		event.preventDefault();

		const textarea = event.currentTarget;
		const cursorPosition = textarea.selectionStart;
		cursorPositionRef.current = cursorPosition;

		const rect = textarea.getBoundingClientRect();
		const { left, top } = getCursorPosition(textarea, cursorPosition);
		const scrollTop = textarea.scrollTop;

		let calculatedLeft = rect.left + left;
		const calculatedTop = rect.top + top - scrollTop;

		const viewportWidth = window.innerWidth;

		if (calculatedLeft + CATEGORY_LIST_WIDTH > viewportWidth)
			calculatedLeft = 0;

		const currentText = watch("memo");
		const newText =
			currentText.slice(0, cursorPosition) +
			"#" +
			currentText.slice(cursorPosition);
		setValue("memo", newText);

		setCategoryInputPosition({
			top: calculatedTop,
			left: calculatedLeft,
		});
		openCategoryPopup("hash");
	};

	/**
	 * 칩·배지 본문 클릭으로 팝업을 연다. 이미 버튼으로 열려 있으면 닫는다.
	 */
	const handleCategoryButtonClick = (
		event: React.MouseEvent<HTMLButtonElement>,
	) => {
		if (categoryPopupOpenSource === "button") {
			closeButtonPopup();
			return;
		}

		categoryPopupTriggerRef.current = event.currentTarget;
		setCategoryInputPosition(getButtonPopupPosition(event.currentTarget));
		openCategoryPopup("button");
	};

	const handleCategorySelect = (category: CategoryRow) => {
		if (categoryPopupOpenSource === "button") {
			selectCategoryFromButton(category);
			return;
		}

		setCategoryPopupOpenSource(null);

		const currentText = watch("memo");
		const hashIndex = currentText.lastIndexOf("#");
		if (hashIndex !== -1) {
			setValue(
				"memo",
				currentText.slice(0, hashIndex) + currentText.slice(hashIndex + 1),
			);
		}

		onCategoryChange(category.id, "hash");
		restoreFocus();
	};

	/**
	 * 버튼 경로의 선택. 본문은 건드리지 않고, 포커스는 새로 그려질 배지 본문으로 보낸다.
	 */
	const selectCategoryFromButton = (category: CategoryRow) => {
		setCategoryPopupOpenSource(null);

		const isCurrentCategory = getValues("categoryId") === category.id;
		if (!isCurrentCategory) {
			onCategoryChange(category.id, "button");
		}

		// 칩에서 골랐다면 칩은 사라지고 배지가 새로 그려지므로, 렌더가 끝난 뒤에 포커스한다.
		setTimeout(() => {
			categoryBadgeButtonRef.current?.focus();
		}, 0);
	};

	const handleCategoryRemove = () => {
		onCategoryChange(null, "button");

		// 배지가 사라지고 칩이 새로 그려지므로, 키보드 포커스가 허공에 남지 않게 칩으로 옮긴다.
		setTimeout(() => {
			categoryAddChipRef.current?.focus();
		}, 0);
	};

	const handleCategoryListClose = () => {
		if (categoryPopupOpenSource === "button") {
			closeButtonPopup();
			return;
		}

		setCategoryPopupOpenSource(null);
		restoreFocus();
	};

	return {
		categories,
		showCategoryList: categoryPopupOpenSource !== null,
		categoryInputPosition,
		commandInputRef,
		categoryPopupRef,
		categoryBadgeButtonRef,
		categoryAddChipRef,
		handleKeyDown,
		handleCategoryButtonClick,
		handleCategorySelect,
		handleCategoryRemove,
		handleCategoryListClose,
	};
}

/** 팝업 위아래 방향을 고를 때 쓰는 최대 높이. 검색창(41px) + 목록 최대 높이(300px) + 테두리 */
const CATEGORY_POPUP_MAX_HEIGHT = 343;
/** 버튼 트리거와 팝업 사이 간격 */
const CATEGORY_POPUP_GAP = 4;

/**
 * 버튼 트리거 기준 팝업 위치. 트리거 위에 오른쪽 끝을 맞춰 띄우고, 위 공간이 모자라면 아래로 내린다.
 * @description 목록 길이와 무관하게 트리거에 붙도록 위로 띄울 때는 bottom 기준으로 잡는다.
 */
const getButtonPopupPosition = (
	triggerElement: HTMLElement,
): TCategoryPopupPosition => {
	const triggerRect = triggerElement.getBoundingClientRect();
	// 트리거가 왼쪽에 가까워도 팝업 왼쪽 끝이 화면 밖으로 나가지 않게 한다.
	const right = Math.min(
		window.innerWidth - triggerRect.right,
		window.innerWidth - CATEGORY_LIST_WIDTH,
	);
	const hasSpaceAbove =
		triggerRect.top - CATEGORY_POPUP_GAP >= CATEGORY_POPUP_MAX_HEIGHT;

	if (hasSpaceAbove) {
		return {
			bottom: window.innerHeight - triggerRect.top + CATEGORY_POPUP_GAP,
			right,
		};
	}

	return { top: triggerRect.bottom + CATEGORY_POPUP_GAP, right };
};

/** 카테고리 팝업을 연 경로. hash는 본문 # 입력, button은 칩·배지 클릭 */
type TCategoryPopupOpenSource = "hash" | "button";

/**
 * 카테고리 팝업의 fixed 위치(px). 경로에 따라 쓰는 변이 다르다.
 * @description # 경로는 top·left, 버튼 경로는 right와 top 또는 bottom을 쓴다.
 * 사용처: CategoryCommandPopup.tsx
 */
export type TCategoryPopupPosition = Pick<
	React.CSSProperties,
	"top" | "bottom" | "left" | "right"
>;
