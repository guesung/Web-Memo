import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "@web-memo/shared/constants";
import {
	useCategoryQuery,
	useDeleteMemosMutation,
	useMemosUpsertMutation,
} from "@web-memo/shared/hooks";
import { analytics } from "@web-memo/shared/modules/analytics";
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
import { useRef, useState } from "react";

interface MemoOptionProps extends LanguageType {
	memos: GetMemoResponse[];
	closeMemoOption?: () => void;
	onDeleteSuccess?: () => void;
	onOpenChange?: (isOpen: boolean) => void;
	/**
	 * 메모 한 개일 때 "카테고리 변경하기"가 서브메뉴 대신 이 팝업을 연다. ⋮ 버튼을 앵커로 넘긴다.
	 * 없거나 메모가 여러 개면 서브메뉴로 일괄 변경한다.
	 */
	onCategoryPopupOpen?: (anchor: HTMLElement) => void;
}

export default function MemoOption({
	lng,
	memos,
	closeMemoOption,
	onDeleteSuccess,
	onOpenChange,
	onCategoryPopupOpen,
}: MemoOptionProps) {
	const { t } = useTranslation(lng);
	const searchParams = useSearchParams();
	const router = useRouter();
	const [isOpen, setIsOpen] = useState(false);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const isCategoryPopupRequestedRef = useRef(false);
	const isMenuCloseCompleteRef = useRef(true);
	const isDeleteClosePendingRef = useRef(false);
	const { categories } = useCategoryQuery();
	const queryClient = useQueryClient();
	const { mutate: mutateUpsertMemo } = useMemosUpsertMutation();
	const { mutateAsync: mutateDeleteMemo } = useDeleteMemosMutation();

	const handleDeleteMemo = async (event?: MouseEvent<HTMLDivElement>) => {
		event?.stopPropagation();

		try {
			const result = await mutateDeleteMemo(memos.map((memo) => memo.id));
			if (result.error) return;
		} catch {
			return;
		}

		const handleToastActionClick = async () => {
			analytics.trackEvent({ name: "memo_undo", params: { action: "delete" } });
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
		if (onDeleteSuccess) {
			if (isMenuCloseCompleteRef.current) onDeleteSuccess();
			else isDeleteClosePendingRef.current = true;
		}
	};

	const handleCategoryChange = async (categoryId: string) => {
		// 일괄 upsert라 뮤테이션 쪽 분기가 못 잡습니다. 여기서 직접 찍습니다.
		analytics.trackEvent({ name: "memo_category_change" });
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

	const handleCategoryPopupSelect = () => {
		isCategoryPopupRequestedRef.current = true;
	};

	// 메뉴가 닫힌 뒤에 팝업을 열거나 다이얼로그를 닫아야 포커스·포인터 잠금이 풀린다.
	const handleMenuCloseAutoFocus = (event: Event) => {
		isMenuCloseCompleteRef.current = true;
		if (isDeleteClosePendingRef.current) {
			isDeleteClosePendingRef.current = false;
			event.preventDefault();
			onDeleteSuccess?.();
			return;
		}
		if (!isCategoryPopupRequestedRef.current) return;

		isCategoryPopupRequestedRef.current = false;
		event.preventDefault();
		if (triggerRef.current) {
			onCategoryPopupOpen?.(triggerRef.current);
		}
	};

	const handleOpenChange = (open: boolean) => {
		if (open) isMenuCloseCompleteRef.current = false;
		setIsOpen(open);
		onOpenChange?.(open);
	};

	const isCategoryPopupMode = memos.length === 1 && !!onCategoryPopupOpen;

	return (
		<DropdownMenu onOpenChange={handleOpenChange} open={isOpen}>
			<DropdownMenuTrigger asChild>
				<Button
					ref={triggerRef}
					variant="ghost"
					size="icon"
					onClick={handleDropdownMenuTriggerClick}
					data-testid="memo-option"
				>
					<EllipsisVerticalIcon size={16} />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent onCloseAutoFocus={handleMenuCloseAutoFocus}>
				<DropdownMenuGroup>
					<DropdownMenuItem
						onClick={handleDeleteMemo}
						className="cursor-pointer"
						data-testid="memo-delete-button"
					>
						{t("option.deleteMemo")}
					</DropdownMenuItem>
					{isCategoryPopupMode ? (
						<DropdownMenuItem
							onSelect={handleCategoryPopupSelect}
							className="cursor-pointer"
							data-testid="memo-change-category-button"
						>
							{t("option.changeCategory")}
						</DropdownMenuItem>
					) : (
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
					)}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
