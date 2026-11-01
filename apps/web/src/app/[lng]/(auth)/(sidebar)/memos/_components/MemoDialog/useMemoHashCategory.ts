import type { MemoInput } from "@src/app/[lng]/(auth)/(sidebar)/memos/_types/Input";
import type { KeyboardEvent } from "react";
import { useRef } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { TMemoCategoryPopover } from "../MemoCardFooter/useMemoCategoryPopover";

/** 커서 위치를 재려고 미러 요소에 옮겨 담는 textarea 스타일 */
const MIRROR_STYLE_PROPERTIES = [
	"boxSizing",
	"width",
	"paddingTop",
	"paddingRight",
	"paddingBottom",
	"paddingLeft",
	"borderTopWidth",
	"borderRightWidth",
	"borderBottomWidth",
	"borderLeftWidth",
	"fontFamily",
	"fontSize",
	"fontStyle",
	"fontWeight",
	"letterSpacing",
	"lineHeight",
	"textIndent",
	"textTransform",
	"wordSpacing",
	"tabSize",
] as const;

interface IFUseMemoHashCategoryProps {
	form: UseFormReturn<MemoInput>;
	markEdited: (field: "memo") => void;
	categoryPopover: TMemoCategoryPopover;
}

/**
 * 편집 모달 본문에서 #을 치면 커서 자리에 카테고리 팝업을 연다.
 * @description 사이드 패널과 같은 규칙이다. #은 본문에 넣고, 카테고리를 고르면 지운다.
 * Esc·바깥 클릭으로 닫으면 #은 글자로 남는다.
 * 사용처: MemoDialog/index.tsx
 */
export function useMemoHashCategory({
	form,
	markEdited,
	categoryPopover,
}: IFUseMemoHashCategoryProps) {
	const hashIndexRef = useRef<number | null>(null);

	const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
		if (event.key !== "#" || event.nativeEvent.isComposing) return;

		event.preventDefault();

		const textarea = event.currentTarget;
		const { selectionStart, selectionEnd } = textarea;
		const currentText = form.getValues("memo") ?? "";
		form.setValue(
			"memo",
			`${currentText.slice(0, selectionStart)}#${currentText.slice(selectionEnd)}`,
		);
		markEdited("memo");
		textarea.setSelectionRange(selectionStart + 1, selectionStart + 1);
		hashIndexRef.current = selectionStart;

		const caretOffset = measureCaretOffset(textarea, selectionStart);
		categoryPopover.openFromHash(
			{
				// 모달이 스크롤돼도 커서에 붙어 있도록 잴 때마다 textarea 위치를 다시 읽는다.
				getBoundingClientRect: () => {
					const rect = textarea.getBoundingClientRect();
					return new DOMRect(
						rect.left + caretOffset.left - textarea.scrollLeft,
						rect.top + caretOffset.top - textarea.scrollTop,
						0,
						caretOffset.height,
					);
				},
			},
			{
				onSelect: () => removeHash(),
				restoreFocus: () => restoreFocus(textarea),
			},
		);
	};

	/** 넣었던 #을 지운다. 사용자가 그 사이 본문을 고쳤으면 마지막 #을 지운다. */
	const removeHash = () => {
		const currentText = form.getValues("memo") ?? "";
		const hashIndex =
			hashIndexRef.current !== null && currentText[hashIndexRef.current] === "#"
				? hashIndexRef.current
				: currentText.lastIndexOf("#");
		if (hashIndex === -1) return;

		form.setValue(
			"memo",
			currentText.slice(0, hashIndex) + currentText.slice(hashIndex + 1),
		);
		markEdited("memo");
		hashIndexRef.current = hashIndex - 1;
	};

	/** # 바로 뒤(지웠다면 # 자리)로 커서를 돌린다. */
	const restoreFocus = (textarea: HTMLTextAreaElement) => {
		if (!textarea.isConnected) return;

		const caret = (hashIndexRef.current ?? textarea.value.length - 1) + 1;
		textarea.focus();
		textarea.setSelectionRange(caret, caret);
	};

	return { handleKeyDown };
}

/**
 * textarea 안에서 position 글자의 왼쪽 위 좌표(테두리 바깥 기준)와 줄 높이.
 * @description 같은 스타일의 미러 요소에 앞 글자를 채워 줄바꿈(자동 줄넘김 포함)까지 반영한다.
 */
function measureCaretOffset(textarea: HTMLTextAreaElement, position: number) {
	const style = window.getComputedStyle(textarea);
	const mirror = document.createElement("div");
	for (const property of MIRROR_STYLE_PROPERTIES) {
		mirror.style[property] = style[property];
	}
	mirror.style.position = "absolute";
	mirror.style.top = "0";
	mirror.style.left = "-9999px";
	mirror.style.visibility = "hidden";
	mirror.style.whiteSpace = "pre-wrap";
	mirror.style.overflowWrap = "break-word";
	mirror.textContent = textarea.value.slice(0, position);

	const marker = document.createElement("span");
	marker.textContent = "#";
	mirror.appendChild(marker);
	document.body.appendChild(mirror);

	const lineHeight = Number.parseFloat(style.lineHeight);
	const offset = {
		left: Number.parseFloat(style.borderLeftWidth) + marker.offsetLeft,
		top: Number.parseFloat(style.borderTopWidth) + marker.offsetTop,
		height: Number.isNaN(lineHeight) ? marker.offsetHeight : lineHeight,
	};
	mirror.remove();

	return offset;
}
