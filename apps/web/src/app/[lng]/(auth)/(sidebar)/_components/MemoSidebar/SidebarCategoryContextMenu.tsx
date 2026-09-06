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
} from "@web-memo/ui";
import { Palette, Pencil, Trash2 } from "lucide-react";

/**
 * 색을 아직 고르지 않은 카테고리의 색상 선택기 기본값
 *
 * @description
 * 브랜드 --primary(221 83% 53%)와 같은 값이다. 예전엔 purple-600(#9333ea)이라
 * 메모 화면이 파랑으로 통일된 뒤에도 여기만 보라가 떴다.
 */
const DEFAULT_CATEGORY_COLOR = "#2563eb";

import {
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";

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
			colorInputRef.current.value = category.color || DEFAULT_CATEGORY_COLOR;
			colorInputRef.current.click();
		}
	};

	const handleColorChange = useCallback(
		(e: Event) => {
			const newColor = (e.target as HTMLInputElement).value;
			if (newColor !== (category.color || DEFAULT_CATEGORY_COLOR)) {
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
			<ContextMenu>
				<ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
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

			<input ref={colorInputRef} type="color" className="sr-only" />

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
