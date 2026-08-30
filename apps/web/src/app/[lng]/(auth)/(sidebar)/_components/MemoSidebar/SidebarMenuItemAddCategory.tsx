"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import {
	useCategoryPostMutation,
	useCategoryQuery,
} from "@web-memo/shared/hooks";
import { generateRandomPastelColor } from "@web-memo/shared/utils";
import { Input, toast } from "@web-memo/ui";
import { PlusIcon } from "lucide-react";
import { memo, useCallback, useRef, useState } from "react";

export default memo(function SidebarMenuItemAddCategory({ lng }: LanguageType) {
	const { t } = useTranslation(lng);
	const [isEditMode, setIsEditMode] = useState(false);
	const [name, setName] = useState("");
	const [color, setColor] = useState(() => generateRandomPastelColor());

	const { categories } = useCategoryQuery();
	const { mutate: mutateCategoryPost } = useCategoryPostMutation();

	const textInputRef = useRef<HTMLInputElement>(null);

	const colorInputCallbackRef = useCallback((el: HTMLInputElement | null) => {
		if (!el) return;
		const handleChange = (e: Event) => {
			setColor((e.target as HTMLInputElement).value);
		};
		el.addEventListener("change", handleChange);
	}, []);

	const handleSubmit = useCallback(() => {
		const trimmedName = name.trim();
		if (!trimmedName) {
			setIsEditMode(false);
			return;
		}

		const isDuplicate = categories?.some(
			(c) => c.name.toLowerCase() === trimmedName.toLowerCase(),
		);

		if (isDuplicate) {
			toast({ title: t("toastTitle.duplicateCategory") });
			setIsEditMode(false);
			setName("");
			setColor(generateRandomPastelColor());
			return;
		}

		mutateCategoryPost(
			{ name: trimmedName, color },
			{
				onSuccess: () => {
					setIsEditMode(false);
					setName("");
					setColor(generateRandomPastelColor());
				},
			},
		);
	}, [name, color, categories, mutateCategoryPost, t]);

	const handleCancel = useCallback(() => {
		setIsEditMode(false);
		setName("");
		setColor(generateRandomPastelColor());
	}, []);

	const handlePlusClick = useCallback(() => {
		setIsEditMode(true);
		setTimeout(() => textInputRef.current?.focus(), 50);
	}, []);

	if (!isEditMode) {
		return (
			<button
				type="button"
				onClick={handlePlusClick}
				className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-700 dark:hover:text-gray-200 transition-all duration-200"
				aria-label={t("setting.addCategory")}
			>
				<PlusIcon size={14} />
				<span className="text-sm font-medium">{t("setting.addCategory")}</span>
			</button>
		);
	}

	return (
		<div
			className="flex w-full items-center gap-3 rounded-lg px-3 py-1.5"
			style={{ borderLeft: `3px solid ${color}` }}
		>
			<div
				className="relative w-2 h-2 rounded-full flex-shrink-0 ring-2 ring-white dark:ring-gray-900 shadow-sm cursor-pointer"
				style={{ backgroundColor: color }}
			>
				<input
					ref={colorInputCallbackRef}
					type="color"
					defaultValue={color}
					className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
					aria-label="Pick color"
				/>
			</div>
			<Input
				ref={textInputRef}
				value={name}
				onChange={(e) => setName(e.target.value)}
				autoFocus
				className="h-7 text-sm"
				placeholder={t("setting.addCategory")}
				onBlur={handleSubmit}
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						e.preventDefault();
						handleSubmit();
					}
					if (e.key === "Escape") {
						handleCancel();
					}
				}}
			/>
		</div>
	);
});
