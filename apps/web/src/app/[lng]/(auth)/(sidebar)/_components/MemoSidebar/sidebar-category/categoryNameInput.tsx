"use client";

import { Input } from "@web-memo/ui";
import { useRef } from "react";

/** 카테고리 이름 편집 입력과 키보드·포커스 동작을 담당한다. */
export default function SidebarCategoryNameInput({
	name,
	onSubmit,
	onCancel,
}: SidebarCategoryNameInputProps) {
	const isSubmittingRef = useRef(false);
	const isCancelledRef = useRef(false);

	const handleSubmit = async (newName: string) => {
		if (isSubmittingRef.current || isCancelledRef.current) return;
		isSubmittingRef.current = true;

		try {
			const isComplete = await onSubmit(newName);
			if (!isComplete) isSubmittingRef.current = false;
		} catch (error) {
			console.error("카테고리 이름 저장 요청 실패", error);
			isSubmittingRef.current = false;
		}
	};

	return (
		<Input
			defaultValue={name}
			autoFocus
			className="h-7 text-sm"
			onBlur={(event) => void handleSubmit(event.currentTarget.value)}
			onKeyDown={(event) => {
				if (event.key === "Escape") {
					if (isSubmittingRef.current) {
						event.preventDefault();
						return;
					}
					isCancelledRef.current = true;
					onCancel();
					return;
				}

				if (event.key === "Enter" && !event.nativeEvent.isComposing) {
					event.preventDefault();
					void handleSubmit(event.currentTarget.value);
				}
			}}
		/>
	);
}

interface SidebarCategoryNameInputProps {
	name: string;
	onSubmit: (newName: string) => Promise<boolean>;
	onCancel: () => void;
}
