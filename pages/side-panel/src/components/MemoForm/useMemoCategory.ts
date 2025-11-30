import type { MemoInput } from "@src/types/Input";
import { useCategoryQuery } from "@web-memo/shared/hooks";
import type { CategoryRow } from "@web-memo/shared/types";
import { useRef, useState } from "react";
import type { UseFormSetValue, UseFormWatch } from "react-hook-form";
import { getCursorPosition } from "./util";

const CATEGORY_LIST_WIDTH = 256;

interface UseMemoCategoryProps {
	watch: UseFormWatch<MemoInput>;
	setValue: UseFormSetValue<MemoInput>;
	textareaRef: React.RefObject<HTMLTextAreaElement | null>;
	onCategorySelect: (categoryId: number) => void;
	onCategoryRemove: () => void;
}

export function useMemoCategory({
	watch,
	setValue,
	textareaRef,
	onCategorySelect,
	onCategoryRemove,
}: UseMemoCategoryProps) {
	const { categories } = useCategoryQuery();
	const [showCategoryList, setShowCategoryList] = useState(false);
	const [categoryInputPosition, setCategoryInputPosition] = useState({
		top: 0,
		left: 0,
	});
	const commandInputRef = useRef<HTMLInputElement>(null);
	const cursorPositionRef = useRef<number | null>(null);

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
		setShowCategoryList(true);

		setTimeout(() => {
			commandInputRef.current?.focus();
		}, 0);
	};

	const handleCategorySelect = (category: CategoryRow) => {
		setShowCategoryList(false);

		const currentText = watch("memo");
		const hashIndex = currentText.lastIndexOf("#");
		if (hashIndex !== -1) {
			setValue(
				"memo",
				currentText.slice(0, hashIndex) + currentText.slice(hashIndex + 1),
			);
		}

		setValue("categoryId", category.id);
		onCategorySelect(category.id);

		if (textareaRef.current) {
			textareaRef.current.focus();
			if (cursorPositionRef.current !== null) {
				textareaRef.current.setSelectionRange(
					cursorPositionRef.current,
					cursorPositionRef.current,
				);
			}
		}
	};

	const handleCategoryRemove = () => {
		setValue("categoryId", null);
		onCategoryRemove();
	};

	const handleCategoryListClose = () => {
		setShowCategoryList(false);
		if (textareaRef.current) {
			textareaRef.current.focus();
			if (cursorPositionRef.current !== null) {
				textareaRef.current.setSelectionRange(
					cursorPositionRef.current,
					cursorPositionRef.current,
				);
			}
		}
	};

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
