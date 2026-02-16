"use client";

import {
	useCategoryPostMutation,
	useCategoryQuery,
} from "@web-memo/shared/hooks";
import { Button, Input, toast } from "@web-memo/ui";
import { PlusIcon } from "lucide-react";
import { memo, useState } from "react";
import { useForm } from "react-hook-form";

import type { CategoryInput } from "../../_types";

export default memo(function SidebarMenuItemAddCategory() {
	const [isEditMode, setIsEditMode] = useState(false);
	const { register, handleSubmit, reset } = useForm<CategoryInput>({
		defaultValues: {
			category: "",
		},
	});

	const { categories } = useCategoryQuery();
	const { mutate: mutateCategoryPost } = useCategoryPostMutation();

	const onSubmit = handleSubmit(({ category }) => {
		const trimmedName = category.trim();
		if (!trimmedName) return;

		const isDuplicate = categories?.some(
			(c) => c.name.toLowerCase() === trimmedName.toLowerCase(),
		);

		if (isDuplicate) {
			toast({ title: "이미 같은 이름의 카테고리가 있어요" });
			return;
		}

		mutateCategoryPost(
			{ name: trimmedName },
			{
				onSuccess: () => {
					setIsEditMode(false);
					reset();
				},
			},
		);
	});

	const handlePlusIconClick = () => {
		setIsEditMode(true);
	};

	return (
		<div className="flex justify-center">
			{isEditMode ? (
				<form onSubmit={onSubmit}>
					<Input {...register("category")} autoFocus />
				</form>
			) : (
				<Button
					className="flex justify-center"
					onClick={handlePlusIconClick}
					variant="ghost"
					size="icon"
				>
					<PlusIcon size={16} />
				</Button>
			)}
		</div>
	);
});
