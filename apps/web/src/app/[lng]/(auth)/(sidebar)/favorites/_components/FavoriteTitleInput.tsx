"use client";

import { Input } from "@web-memo/ui";
import { useRef } from "react";

interface FavoriteTitleInputProps {
	title: string;
	ariaLabel: string;
	onSubmit: (title: string) => void;
	onCancel: () => void;
}

/** 즐겨찾기 제목 편집 입력. Enter·blur는 저장, Esc는 취소하며 한 번만 끝낸다. */
export function FavoriteTitleInput({
	title,
	ariaLabel,
	onSubmit,
	onCancel,
}: FavoriteTitleInputProps) {
	const isFinishedRef = useRef(false);

	function finish(action: () => void) {
		if (isFinishedRef.current) return;
		isFinishedRef.current = true;
		action();
	}

	return (
		<Input
			defaultValue={title}
			aria-label={ariaLabel}
			autoFocus
			className="h-8 text-sm"
			onFocus={(event) => event.currentTarget.select()}
			onBlur={(event) => {
				const value = event.currentTarget.value;
				finish(() => onSubmit(value));
			}}
			onKeyDown={(event) => {
				if (event.key === "Escape") {
					finish(onCancel);
					return;
				}

				if (event.key === "Enter" && !event.nativeEvent.isComposing) {
					event.preventDefault();
					const value = event.currentTarget.value;
					finish(() => onSubmit(value));
				}
			}}
		/>
	);
}
