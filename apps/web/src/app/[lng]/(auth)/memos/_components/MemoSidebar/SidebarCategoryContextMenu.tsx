"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import {
	useCategoryDeleteMutation,
	useCategoryUpdateMutation,
} from "@web-memo/shared/hooks";
import type { CategoryRow } from "@web-memo/shared/types";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@web-memo/ui";
import { MoreHorizontal, Palette, Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export default function SidebarCategoryContextMenu({
	category,
	lng,
	children,
	onStartEditing,
}: SidebarCategoryContextMenuProps) {
	const { t } = useTranslation(lng);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const colorInputRef = useRef<HTMLInputElement>(null);

	const { mutate: updateCategory } = useCategoryUpdateMutation();
	const { mutate: deleteCategory } = useCategoryDeleteMutation();

	const handleRename = () => {
		onStartEditing();
	};

	const openColorPicker = () => {
		if (colorInputRef.current) {
			colorInputRef.current.value = category.color || "#9333ea";
			colorInputRef.current.click();
		}
	};

	const handleColorChange = useCallback(
		(e: Event) => {
			const newColor = (e.target as HTMLInputElement).value;
			if (newColor !== (category.color || "#9333ea")) {
				updateCategory({ id: category.id, request: { color: newColor } });
			}
		},
		[category.id, category.color, updateCategory],
	);

	useEffect(() => {
		const input = colorInputRef.current;
		if (!input) return;
		input.addEventListener("change", handleColorChange);
		return () => input.removeEventListener("change", handleColorChange);
	}, [handleColorChange]);

	const handleDelete = () => {
		deleteCategory(category.id, {
			onSuccess: () => {
				setShowDeleteDialog(false);
			},
		});
	};

	return (
		<>
			<div className="group/category relative">
				<ContextMenu>
					<ContextMenuTrigger asChild>
						{children}
					</ContextMenuTrigger>
					<ContextMenuContent>
						<ContextMenuItem onClick={handleRename}>
							<Pencil size={14} className="mr-2" />
							{t("sideBar.rename")}
						</ContextMenuItem>
						<ContextMenuItem onClick={openColorPicker}>
							<Palette size={14} className="mr-2" />
							{t("sideBar.changeColor")}
						</ContextMenuItem>
						<ContextMenuItem
							onClick={() => setShowDeleteDialog(true)}
							className="text-destructive"
						>
							<Trash2 size={14} className="mr-2" />
							{t("sideBar.deleteCategory")}
						</ContextMenuItem>
					</ContextMenuContent>
				</ContextMenu>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-1 rounded-md opacity-0 group-hover/category:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700 transition-opacity"
						>
							<MoreHorizontal size={14} className="text-gray-500 dark:text-gray-400" />
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" side="right">
						<DropdownMenuItem onClick={handleRename}>
							<Pencil size={14} className="mr-2" />
							{t("sideBar.rename")}
						</DropdownMenuItem>
						<DropdownMenuItem onClick={openColorPicker}>
							<Palette size={14} className="mr-2" />
							{t("sideBar.changeColor")}
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => setShowDeleteDialog(true)}
							className="text-destructive"
						>
							<Trash2 size={14} className="mr-2" />
							{t("sideBar.deleteCategory")}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<input
				ref={colorInputRef}
				type="color"
				className="sr-only"
			/>

			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
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
						<AlertDialogAction onClick={handleDelete}>
							{t("sideBar.deleteCategory")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

interface SidebarCategoryContextMenuProps extends LanguageType {
	category: CategoryRow;
	children: ReactNode;
	onStartEditing: () => void;
}
