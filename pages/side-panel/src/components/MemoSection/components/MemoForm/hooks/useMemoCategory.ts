import type { MemoInput } from "@src/types/Input";
import { useCategoryQuery } from "@web-memo/shared/hooks";
import type { CategoryRow } from "@web-memo/shared/types";
import { useCallback, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { getCursorPosition } from "../utils.ts";

const CATEGORY_LIST_WIDTH = 256;

interface UseMemoCategoryProps {
	textareaRef: React.RefObject<HTMLTextAreaElement | null>;
	onCategoryChange: (categoryId: number | null) => void;
}

export default function useMemoCategory({
	textareaRef,
	onCategoryChange,
}: UseMemoCategoryProps) {
	const { watch, setValue } = useFormContext<MemoInput>();
	const { categories } = useCategoryQuery();
	const [showCategoryList, setShowCategoryList] = useState(false);
	const [categoryInputPosition, setCategoryInputPosition] = useState({
		top: 0,
		left: 0,
	});
	const commandInputRef = useRef<HTMLInputElement>(null);
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

	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
			setShowCategoryList(true);

			setTimeout(() => {
				commandInputRef.current?.focus();
			}, 0);
		},
		[watch, setValue],
	);

	const handleCategorySelect = useCallback(
		(category: CategoryRow) => {
			setShowCategoryList(false);

			const currentText = watch("memo");
			const hashIndex = currentText.lastIndexOf("#");
			if (hashIndex !== -1) {
				setValue(
					"memo",
					currentText.slice(0, hashIndex) + currentText.slice(hashIndex + 1),
				);
			}

			onCategoryChange(category.id);
			restoreFocus();
		},
		[watch, setValue, onCategoryChange, restoreFocus],
	);

	const handleCategoryRemove = useCallback(() => {
		onCategoryChange(null);
	}, [onCategoryChange]);

	const handleCategoryListClose = useCallback(() => {
		setShowCategoryList(false);
		restoreFocus();
	}, [restoreFocus]);

	return {
		categories,
		showCategoryList,
		categoryInputPosition,
		commandInputRef,
		handleKeyDown,
		handleCategorySelect,
		handleCategoryRemove,
		handleCategoryListClose,
	};
}
