import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import {
	useCategoryDeleteMutation,
	useCategoryPostMutation,
	useCategoryQuery,
	useCategoryUpdateMutation,
} from "@web-memo/shared/hooks";
import { generateRandomPastelColor } from "@web-memo/shared/utils";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	Button,
	Input,
	toast,
} from "@web-memo/ui";
import { PlusIcon, TrashIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/** 메모를 묶는 카테고리를 만들고 이름·색을 바꾸고 지우는 설정 */
export default function SettingCategoryForm({
	lng,
}: IFSettingCategoryFormProps) {
	const { t } = useTranslation(lng);

	const { categories } = useCategoryQuery();
	const { mutate: deleteCategory } = useCategoryDeleteMutation();
	const { mutate: insertCategory } = useCategoryPostMutation();
	const { mutate: updateCategory } = useCategoryUpdateMutation();

	const [editingId, setEditingId] = useState<number | null>(null);
	const [isAdding, setIsAdding] = useState(false);
	const [categoryIdToDelete, setCategoryIdToDelete] = useState<number | null>(
		null,
	);
	const editInputRef = useRef<HTMLInputElement>(null);
	const addInputRef = useRef<HTMLInputElement>(null);
	const colorInputRef = useRef<HTMLInputElement>(null);
	const colorTargetIdRef = useRef<number | null>(null);

	const handleColorChange = useCallback(
		(e: Event) => {
			const newColor = (e.target as HTMLInputElement).value;
			const targetId = colorTargetIdRef.current;
			if (!targetId) return;

			const current = categories?.find((c) => c.id === targetId);
			if (current && newColor !== (current.color || "#000000")) {
				updateCategory({ id: targetId, request: { color: newColor } });
			}
		},
		[categories, updateCategory],
	);

	useEffect(() => {
		const input = colorInputRef.current;
		if (!input) return;
		input.addEventListener("change", handleColorChange);
		return () => input.removeEventListener("change", handleColorChange);
	}, [handleColorChange]);

	const handleRenameSubmit = (categoryId: number, newName: string) => {
		const trimmedName = newName.trim();
		setEditingId(null);

		if (!trimmedName) return;

		const current = categories?.find((c) => c.id === categoryId);
		if (current?.name === trimmedName) return;

		const isDuplicate = categories?.some(
			(c) =>
				c.id !== categoryId &&
				c.name.toLowerCase() === trimmedName.toLowerCase(),
		);
		if (isDuplicate) {
			toast({ title: t("toastTitle.duplicateCategory") });
			return;
		}

		updateCategory({ id: categoryId, request: { name: trimmedName } });
	};

	const handleAddSubmit = (name: string) => {
		const trimmedName = name.trim();
		setIsAdding(false);

		if (!trimmedName) return;

		const isDuplicate = categories?.some(
			(c) => c.name.toLowerCase() === trimmedName.toLowerCase(),
		);
		if (isDuplicate) {
			toast({ title: t("toastTitle.duplicateCategory") });
			return;
		}

		insertCategory(
			{ name: trimmedName, color: generateRandomPastelColor() },
			{ onSuccess: () => toast({ title: t("toastTitle.successSave") }) },
		);
	};

	const handleCategoryDeleteConfirm = () => {
		if (!categoryIdToDelete) return;

		deleteCategory(categoryIdToDelete, {
			onSuccess: () => toast({ title: t("toastTitle.successSave") }),
		});
		setCategoryIdToDelete(null);
	};

	const openColorPicker = (categoryId: number, currentColor: string) => {
		colorTargetIdRef.current = categoryId;
		if (colorInputRef.current) {
			colorInputRef.current.value = currentColor || "#000000";
			colorInputRef.current.click();
		}
	};

	return (
		<div className="relative">
			<div className="space-y-1">
				{categories?.map((category) => {
					const isEditing = editingId === category.id;
					const categoryColor = category.color || "#9333ea";

					return (
						<div
							key={category.id}
							className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted dark:hover:bg-muted/50 transition-colors group"
						>
							<button
								type="button"
								className="relative w-5 h-5 rounded-full flex-shrink-0 ring-2 ring-border hover:ring-muted-foreground transition-all cursor-pointer hover:scale-110"
								style={{ backgroundColor: categoryColor }}
								onClick={() => openColorPicker(category.id, categoryColor)}
								aria-label={t("sideBar.changeColor")}
							/>
							{isEditing ? (
								<Input
									ref={editInputRef}
									defaultValue={category.name}
									autoFocus
									className="h-7 flex-1 text-sm"
									onBlur={(e) =>
										handleRenameSubmit(category.id, e.target.value)
									}
									onKeyDown={(e) => {
										if (e.key === "Enter")
											handleRenameSubmit(category.id, e.currentTarget.value);
										if (e.key === "Escape") setEditingId(null);
									}}
								/>
							) : (
								<button
									type="button"
									className="flex-1 text-sm font-medium text-foreground cursor-pointer truncate hover:text-foreground transition-colors text-left"
									onClick={() => {
										setEditingId(category.id);
										setTimeout(() => editInputRef.current?.focus(), 50);
									}}
								>
									{category.name}
								</button>
							)}
							<Button
								variant="ghost"
								size="icon"
								className="text-destructive h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
								type="button"
								onClick={() => setCategoryIdToDelete(category.id)}
							>
								<TrashIcon size={14} />
							</Button>
						</div>
					);
				})}

				{categories?.length === 0 && !isAdding && (
					<p className="px-3 py-2 text-sm text-muted-foreground">
						{t("setting.categoryEmpty")}
					</p>
				)}

				{isAdding ? (
					<div className="flex items-center gap-3 rounded-lg px-3 py-2">
						<div className="w-5 h-5 rounded-full flex-shrink-0 bg-muted-foreground/40" />
						<Input
							ref={addInputRef}
							autoFocus
							placeholder={t("setting.defaultCategoryName")}
							className="h-7 flex-1 text-sm"
							onBlur={(e) => handleAddSubmit(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") handleAddSubmit(e.currentTarget.value);
								if (e.key === "Escape") setIsAdding(false);
							}}
						/>
					</div>
				) : (
					<Button
						variant="ghost"
						className="w-full justify-start gap-3 px-3 py-2 text-muted-foreground hover:text-foreground"
						onClick={() => setIsAdding(true)}
						type="button"
					>
						<PlusIcon size={16} />
						<span className="text-sm">{t("setting.addCategory")}</span>
					</Button>
				)}
			</div>

			<input
				ref={colorInputRef}
				type="color"
				className="absolute opacity-0 pointer-events-none"
			/>

			<AlertDialog
				open={categoryIdToDelete !== null}
				onOpenChange={(open) => {
					if (!open) {
						setCategoryIdToDelete(null);
					}
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{t("sideBar.deleteConfirmTitle")}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{t("sideBar.deleteConfirmDescription")}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t("sideBar.cancel")}</AlertDialogCancel>
						<AlertDialogAction onClick={handleCategoryDeleteConfirm}>
							{t("sideBar.deleteCategory")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

interface IFSettingCategoryFormProps extends LanguageType {}
