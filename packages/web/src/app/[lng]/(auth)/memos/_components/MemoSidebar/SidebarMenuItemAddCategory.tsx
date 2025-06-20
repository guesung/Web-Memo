"use client";

import { useCategoryPostMutation } from "@extension/shared/hooks";
import { Button, Input } from "@extension/ui";
import { PlusIcon } from "lucide-react";
import { memo, useState } from "react";
import { useForm } from "react-hook-form";

import type { CategoryInput } from "../../_types";

export default memo(function SidebarMenuItemAddCategory() {
	const [isEditMode, setIsEditMode] = useState(false);
	const { register, handleSubmit } = useForm<CategoryInput>({
		defaultValues: {
			category: "",
		},
	});

	const { mutate: mutateCategoryPost } = useCategoryPostMutation();

	const onSubmit = handleSubmit(({ category }) => {
		mutateCategoryPost({ name: category });
	});

	const handlePlusIconClick = () => {
		setIsEditMode(true);
	};

	return (
		<div className="flex justify-center">
			{isEditMode ? (
				<form onSubmit={onSubmit}>
					<Input {...register("category")} />
				</form>
			) : (
				<Button
					className="flex justify-center"
					role="button"
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
