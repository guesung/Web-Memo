import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "@web-memo/shared/constants";
import {
	useCategoryQuery,
	useDeleteMemosMutation,
	useMemosUpsertMutation,
} from "@web-memo/shared/hooks";
import { useSearchParams } from "@web-memo/shared/modules/search-params";
import type { GetMemoResponse } from "@web-memo/shared/types";
import {
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
	ToastAction,
	toast,
} from "@web-memo/ui";
import { EllipsisVerticalIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { useState } from "react";

interface MemoOptionProps extends LanguageType {
	memos: GetMemoResponse[];
	closeMemoOption?: () => void;
	onOpenChange?: (isOpen: boolean) => void;
}

export default function MemoOption({
	lng,
	memos,
	closeMemoOption,
	onOpenChange,
}: MemoOptionProps) {
	const { t } = useTranslation(lng);
	const searchParams = useSearchParams();
	const router = useRouter();
	const [isOpen, setIsOpen] = useState(false);
	const { categories } = useCategoryQuery();
	const queryClient = useQueryClient();
	const { mutate: mutateUpsertMemo } = useMemosUpsertMutation();
	const { mutate: mutateDeleteMemo } = useDeleteMemosMutation();

	const handleDeleteMemo = async (event?: MouseEvent<HTMLDivElement>) => {
		event?.stopPropagation();

		mutateDeleteMemo(memos.map((memo) => memo.id));

		const handleToastActionClick = async () => {
			mutateUpsertMemo(memos);

			queryClient.invalidateQueries({ queryKey: QUERY_KEY.memos() });
		};

		toast({
			title: t("toastTitle.memoDeleted"),
			action: (
				<ToastAction
					altText={t("toastActionMessage.undo")}
					onClick={handleToastActionClick}
				>
					{t("toastActionMessage.undo")}
				</ToastAction>
			),
		});

		setIsOpen(false);
		closeMemoOption?.();
	};

	const handleCategoryChange = async (categoryId: string) => {
		const currentCategory = categories?.find(
			(category) => category.id === Number(categoryId),
		);
		mutateUpsertMemo(
			memos.map((memo) => ({
				...memo,
				category_id: Number(categoryId),
				category: currentCategory ?? null,
			})),
		);

		const category = categories?.find(
			(category) => category.id === Number(categoryId),
		);
		if (!category) return;

		toast({
			title: t("toastTitle.categoryEdited"),
			action: (
				<ToastAction
					altText={t("toastActionMessage.goTo")}
					onClick={() => {
						searchParams.set("category", category.name);

						router.push(searchParams.getUrl());
					}}
				>
					{t("toastActionMessage.goTo")}
				</ToastAction>
			),
		});

		queryClient.invalidateQueries({ queryKey: QUERY_KEY.memos() });

		setIsOpen(false);
	};

	const handleDropdownMenuTriggerClick = (
		event: MouseEvent<HTMLButtonElement>,
	) => {
		event.stopPropagation();
	};

	const handleOpenChange = (open: boolean) => {
		setIsOpen(open);
		onOpenChange?.(open);
	};

	return (
		<DropdownMenu onOpenChange={handleOpenChange} open={isOpen}>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					onClick={handleDropdownMenuTriggerClick}
					data-testid="memo-option"
				>
					<EllipsisVerticalIcon size={16} />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuGroup>
					<DropdownMenuItem
						onClick={handleDeleteMemo}
						className="cursor-pointer"
						data-testid="memo-delete-button"
					>
						{t("option.deleteMemo")}
					</DropdownMenuItem>
					<DropdownMenuSub>
						<DropdownMenuSubTrigger>
							{t("option.changeCategory")}
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent>
							{categories?.map((category) => (
								<DropdownMenuItem
									key={category.id}
									onClick={() => handleCategoryChange(String(category.id))}
									className="cursor-pointer"
								>
									{category.name}
								</DropdownMenuItem>
							))}
						</DropdownMenuSubContent>
					</DropdownMenuSub>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
