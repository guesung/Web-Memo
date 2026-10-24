import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { DEFAULT_CATEGORY_COLOR } from "@web-memo/shared/constants";
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
import { PencilIcon, PlusIcon, TrashIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/** 메모를 묶는 카테고리를 만들고 이름·색을 바꾸고 지우는 설정 */
export default function SettingCategoryForm({
	lng,
}: IFSettingCategoryFormProps) {
	const { t } = useTranslation(lng);

	const { categories } = useCategoryQuery();
	const { mutate: deleteCategory } = useCategoryDeleteMutation();
	const { mutate: insertCategory, isPending: isInserting } =
		useCategoryPostMutation();
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
	/** 제출·취소로 입력칸을 닫은 뒤 언마운트 blur가 다시 제출하지 않게 막는다. 입력칸을 열 때 푼다. */
	const isInputClosedRef = useRef(false);

	const handleColorChange = useCallback(
		(e: Event) => {
			const newColor = (e.target as HTMLInputElement).value;
			const targetId = colorTargetIdRef.current;
			if (!targetId) return;

			const current = categories?.find((c) => c.id === targetId);
			if (current && newColor !== (current.color || DEFAULT_CATEGORY_COLOR)) {
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
		if (isInputClosedRef.current) return;
		isInputClosedRef.current = true;

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
		if (isInserting || isInputClosedRef.current) return;
		isInputClosedRef.current = true;

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

	const handleRenameCancel = () => {
		isInputClosedRef.current = true;
		setEditingId(null);
	};

	const handleAddCancel = () => {
		isInputClosedRef.current = true;
		setIsAdding(false);
	};

	const handleRenameOpen = (categoryId: number) => {
		isInputClosedRef.current = false;
		setEditingId(categoryId);
		setTimeout(() => editInputRef.current?.focus(), 50);
	};

	const handleAddOpen = () => {
		isInputClosedRef.current = false;
		setIsAdding(true);
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
			colorInputRef.current.value = currentColor || DEFAULT_CATEGORY_COLOR;
			colorInputRef.current.click();
		}
	};

	return (
		<div className="relative">
			<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
				{categories?.map((category) => {
					const isEditing = editingId === category.id;
					const categoryColor = category.color || DEFAULT_CATEGORY_COLOR;

					return (
						<div
							key={category.id}
							className="flex min-w-0 items-center gap-3 rounded-lg border border-border px-3 py-2 transition-colors hover:bg-muted dark:hover:bg-muted/50"
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
									className="h-7 min-w-0 flex-1 text-sm"
									onBlur={(e) =>
										handleRenameSubmit(category.id, e.target.value)
									}
									onKeyDown={(e) => {
										if (e.key === "Enter") e.currentTarget.blur();
										if (e.key === "Escape") handleRenameCancel();
									}}
								/>
							) : (
								<button
									type="button"
									className="min-w-0 flex-1 cursor-pointer break-words text-left text-sm font-medium text-foreground transition-colors hover:text-foreground"
									onClick={() => handleRenameOpen(category.id)}
								>
									{category.name}
								</button>
							)}
							<Button
								variant="ghost"
								size="icon"
								className="h-7 w-7 shrink-0"
								type="button"
								aria-label={t("setting.renameCategory", {
									name: category.name,
								})}
								onClick={() => handleRenameOpen(category.id)}
							>
								<PencilIcon size={14} />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								className="h-7 w-7 shrink-0 text-destructive"
								type="button"
								aria-label={t("setting.deleteCategoryNamed", {
									name: category.name,
								})}
								onClick={() => setCategoryIdToDelete(category.id)}
							>
								<TrashIcon size={14} />
							</Button>
						</div>
					);
				})}

				{categories?.length === 0 && !isAdding && (
					<p className="col-span-full px-3 py-2 text-sm text-muted-foreground">
						{t("setting.categoryEmpty")}
					</p>
				)}

				{isAdding ? (
					<div className="col-span-full flex min-w-0 items-center gap-3 rounded-lg px-3 py-2">
						<div className="w-5 h-5 rounded-full flex-shrink-0 bg-muted-foreground/40" />
						<Input
							ref={addInputRef}
							autoFocus
							placeholder={t("setting.defaultCategoryName")}
							className="h-7 flex-1 text-sm"
							onBlur={(e) => handleAddSubmit(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") e.currentTarget.blur();
								if (e.key === "Escape") handleAddCancel();
							}}
						/>
					</div>
				) : (
					<Button
						variant="ghost"
						className="col-span-full w-full justify-start gap-3 px-3 py-2 text-muted-foreground hover:text-foreground"
						onClick={handleAddOpen}
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
