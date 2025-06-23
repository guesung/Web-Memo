import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import {
    useCategoryDeleteMutation,
    useCategoryPostMutation,
    useCategoryQuery,
    useCategoryUpsertMutation,
} from "@web-memo/shared/hooks";
import { generateRandomPastelColor } from "@web-memo/shared/utils";
import { Button, Input, Label, toast } from "@web-memo/ui";
import { TrashIcon } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

interface CategoryForm {
	categories: {
		id: number;
		name: string;
		color: string;
	}[];
}

interface SettingCategoryFormProps extends LanguageType {}

export default function SettingCategoryForm({ lng }: SettingCategoryFormProps) {
	const { t } = useTranslation(lng);

	const { categories } = useCategoryQuery();
	const { mutate: deleteCategory } = useCategoryDeleteMutation();
	const { mutate: upsertCategory } = useCategoryUpsertMutation();
	const { mutate: insertCategory } = useCategoryPostMutation();
	const { register, handleSubmit, setValue } = useForm<CategoryForm>({
		defaultValues: {
			categories: [],
		},
	});

	const handleAddCategory = () => {
		const defaultCategoryName = t("setting.defaultCategoryName");

		insertCategory(
			{
				name: defaultCategoryName,
				color: generateRandomPastelColor(),
			},
			{
				onSuccess: () => {
					toast({ title: t("toastTitle.successSave") });
				},
			},
		);
	};

	const handleCategoryDelete = (id: number) => {
		deleteCategory(id, {
			onSuccess: () => {
				toast({ title: t("toastTitle.successSave") });
			},
		});
	};

	const onCategoryFormSubmit = (data: CategoryForm) => {
		upsertCategory(data.categories, {
			onSuccess: () => {
				toast({ title: t("toastTitle.successSave") });
			},
		});
	};

	useEffect(() => {
		if (!categories) return;

		setValue(
			"categories",
			categories.map((category) => ({
				id: category.id,
				name: category.name,
				color: category.color || "#000000",
			})),
		);
	}, [categories, setValue]);

	return (
		<form
			className="grid grid-cols-12"
			onSubmit={handleSubmit(onCategoryFormSubmit)}
		>
			<Label className="col-span-4 grid place-items-center">
				{t("setting.category")}
			</Label>
			<div className="col-span-6 space-y-2">
				{categories?.map(({ id }, index) => (
					<div key={id} className="flex items-center gap-2">
						<Input {...register(`categories.${index}.name`)} />
						<Input
							type="color"
							{...register(`categories.${index}.color`)}
							className="h-9 w-14"
						/>
						<div
							className="h-9 w-9 rounded border"
							style={{
								backgroundColor: categories[index].color + "20",
								borderColor: categories[index].color || undefined,
							}}
						/>
						<Button
							variant="ghost"
							size="icon"
							className="text-destructive h-9 w-9"
							type="button"
							onClick={() => handleCategoryDelete(id)}
						>
							<TrashIcon size={16} />
						</Button>
					</div>
				))}
				<Button
					variant="outline"
					className="w-full"
					onClick={handleAddCategory}
					type="button"
				>
					{t("setting.addCategory")}
				</Button>
			</div>
			<div className="col-span-2 grid place-items-center">
				<Button type="submit" variant="outline">
					{t("common.save")}
				</Button>
			</div>
		</form>
	);
}
