import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "@web-memo/shared/constants";
import {
	useCategoryQuery,
	useDeleteMemosMutation,
	useMemosQuery,
	useMemosUpsertMutation,
} from "@web-memo/shared/hooks";
import { useSearchParams } from "@web-memo/shared/modules/search-params";
import { isAllSame } from "@web-memo/shared/utils";
import {
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
	ToastAction,
	toast,
} from "@web-memo/ui";
import { EllipsisVerticalIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { useState } from "react";

interface MemoOptionProps extends LanguageType {
	memoIds: number[];
	closeMemoOption?: () => void;
}

export default function MemoOption({
	lng,
	memoIds = [],
	closeMemoOption,
}: MemoOptionProps) {
	const { t } = useTranslation(lng);
	const searchParams = useSearchParams();
	const router = useRouter();
	const [isOpen, setIsOpen] = useState(false);
	const { categories } = useCategoryQuery();
	const queryClient = useQueryClient();
	const { mutate: mutateUpsertMemo } = useMemosUpsertMutation();
	const { mutate: mutateDeleteMemo } = useDeleteMemosMutation();

	const { memos } = useMemosQuery({
		isWish: searchParams.get("isWish") === "true",
	});
	const selectedMemos = memos.filter((memo) => memoIds.includes(memo.id));

	const defaultCategoryId = isAllSame(
		selectedMemos.map((memo) => memo.category_id),
	)
		? String(selectedMemos.at(0)?.category_id)
		: "";

	const handleDeleteMemo = async (event?: MouseEvent<HTMLDivElement>) => {
		event?.stopPropagation();

		mutateDeleteMemo(selectedMemos.map((memo) => memo.id));

		const handleToastActionClick = async () => {
			mutateUpsertMemo(selectedMemos);

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
		const currentMemo = memos.filter((memo) => memoIds.includes(memo.id));
		const currentCategory = categories?.find(
			(category) => category.id === Number(categoryId),
		);
		mutateUpsertMemo(
			currentMemo.map((memo) => ({
				...memo,
				category_id: Number(categoryId),
				category: currentCategory,
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

	return (
		<DropdownMenu onOpenChange={setIsOpen} open={isOpen}>
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
					<DropdownMenuItem>
						<Select
							onValueChange={handleCategoryChange}
							defaultValue={defaultCategoryId}
						>
							<SelectTrigger>
								<SelectValue placeholder={t("option.changeCategory")} />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									{categories?.map((category) => (
										<SelectItem
											key={category.id}
											value={String(category.id)}
											id={String(category.id)}
											className="cursor-pointer"
										>
											{category.name}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
