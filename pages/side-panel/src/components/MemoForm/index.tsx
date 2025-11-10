import withAuthentication from "@src/hoc/withAuthentication";
import type { MemoInput } from "@src/types/Input";
import { getMemoUrl } from "@src/utils";
import {
	useCategoryQuery,
	useDebounce,
	useDidMount,
	useMemoByURLQuery,
	useMemoPatchMutation,
	useMemoPostMutation,
	useTabQuery,
} from "@web-memo/shared/hooks";
import { ExtensionBridge } from "@web-memo/shared/modules/extension-bridge";
import type { CategoryRow } from "@web-memo/shared/types";
import { getMemoInfo, I18n, Tab } from "@web-memo/shared/utils/extension";
import {
	Badge,
	cn,
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	Textarea,
	toast,
	ToastAction,
} from "@web-memo/ui";
import { CheckIcon, HeartIcon, Loader2Icon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { getCursorPosition } from "./util";

// Constants
const CATEGORY_LIST_WIDTH = 256;
const SAVE_FEEDBACK_DELAY = 500;
const CATEGORY_TRIGGER_KEY = "#";
const HASH_SYMBOL = "#";

// Helper functions
function getWishToastTitle(isWish: boolean): string {
	return isWish ? I18n.get("wish_list_added") : I18n.get("wish_list_deleted");
}

function MemoForm() {
	const { debounce } = useDebounce();
	const { data: tab } = useTabQuery();
	const { memo: memoData, refetch: refetchMemo } = useMemoByURLQuery({
		url: tab?.url,
	});

	const { categories } = useCategoryQuery();
	const [showCategoryList, setShowCategoryList] = useState(false);
	const [categoryInputPosition, setCategoryInputPosition] = useState({
		top: 0,
		left: 0,
	});
	const [isSaving, setIsSaving] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);
	const commandInputRef = useRef<HTMLInputElement>(null);
	const cursorPositionRef = useRef<number | null>(null);
	const [isCreating, setIsCreating] = useState(false);

	const { register, setValue, watch, getValues } = useForm<MemoInput>({
		defaultValues: {
			memo: "",
			isWish: false,
			categoryId: null,
		},
	});
	const { ref, ...rest } = register("memo");

	const { mutate: mutateMemoPatch } = useMemoPatchMutation();
	const { mutate: mutateMemoPost } = useMemoPostMutation();

	// Watch form values
	const formValues = watch();

	const stopSavingAfterDelay = () => {
		setTimeout(() => {
			setIsSaving(false);
		}, SAVE_FEEDBACK_DELAY);
	};

	const buildMemoData = async (memoInput: MemoInput) => {
		const memoInfo = await getMemoInfo();
		return {
			...memoInfo,
			memo: memoInput.memo,
			isWish: memoInput.isWish,
			category_id: memoInput.categoryId,
		};
	};

	const updateExistingMemo = async (memoInput: MemoInput) => {
		if (!memoData) return;

		const memoPayload = await buildMemoData(memoInput);
		mutateMemoPatch(
			{ id: memoData.id, request: memoPayload },
			{ onSuccess: stopSavingAfterDelay },
		);
	};

	const createNewMemo = async (memoInput: MemoInput) => {
		if (isCreating) return;

		setIsCreating(true);
		const memoPayload = await buildMemoData(memoInput);

		mutateMemoPost(memoPayload, {
			onSuccess: () => {
				stopSavingAfterDelay();
				setIsCreating(false);
			},
		});
	};

	const saveMemo = async (memoInput: MemoInput) => {
		setIsSaving(true);

		if (memoData) {
			await updateExistingMemo(memoInput);
		} else {
			await createNewMemo(memoInput);
		}
	};

	useDidMount(() => {
		ExtensionBridge.responseRefetchTheMemos(refetchMemo);
	});

	useEffect(() => {
		setValue("memo", memoData?.memo ?? "");
		setValue("isWish", memoData?.isWish ?? false);
		setValue("categoryId", memoData?.category_id ?? null);
	}, [memoData?.memo, memoData?.isWish, memoData?.category_id, setValue]);

	const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (event.key !== CATEGORY_TRIGGER_KEY) return;

		event.preventDefault();

		const textarea = event.currentTarget;
		const cursorPosition = textarea.selectionStart;
		cursorPositionRef.current = cursorPosition;

		const rect = textarea.getBoundingClientRect();
		const { left, top } = getCursorPosition(textarea, cursorPosition);
		const scrollTop = textarea.scrollTop;

		let calculatedLeft = rect.left + left;
		const calculatedTop = rect.top + top - scrollTop;

		const viewportWidth = window.innerWidth;

		if (calculatedLeft + CATEGORY_LIST_WIDTH > viewportWidth)
			calculatedLeft = 0;

		const newText =
			formValues.memo.slice(0, cursorPosition) +
			HASH_SYMBOL +
			formValues.memo.slice(cursorPosition);
		setValue("memo", newText);

		setCategoryInputPosition({
			top: calculatedTop,
			left: calculatedLeft,
		});
		setShowCategoryList(true);

		setTimeout(() => {
			commandInputRef.current?.focus();
		}, 0);
	};

	const handleMemoChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
		const text = event.target.value;
		setValue("memo", text);
		debounce(() =>
			saveMemo({
				memo: text,
				isWish: formValues.isWish,
				categoryId: formValues.categoryId,
			}),
		);
	};

	const removeHashSymbolFromMemo = () => {
		const hashIndex = formValues.memo.lastIndexOf(HASH_SYMBOL);
		if (hashIndex !== -1) {
			const newMemo =
				formValues.memo.slice(0, hashIndex) +
				formValues.memo.slice(hashIndex + 1);
			setValue("memo", newMemo);
			return newMemo;
		}
		return formValues.memo;
	};

	const restoreCursorPosition = () => {
		if (!textareaRef.current) return;

		textareaRef.current.focus();
		if (cursorPositionRef.current !== null) {
			textareaRef.current.setSelectionRange(
				cursorPositionRef.current,
				cursorPositionRef.current,
			);
		}
	};

	const closeCategoryList = () => {
		setShowCategoryList(false);
		restoreCursorPosition();
	};

	const handleCategoryListEscape = () => {
		closeCategoryList();
	};

	const handleCategorySelect = (category: CategoryRow) => {
		setShowCategoryList(false);

		const updatedMemo = removeHashSymbolFromMemo();
		setValue("categoryId", category.id);
		restoreCursorPosition();

		saveMemo({
			memo: updatedMemo,
			isWish: formValues.isWish,
			categoryId: category.id,
		});
	};

	const handleCategoryRemove = () => {
		setValue("categoryId", null);
		debounce(() =>
			saveMemo({
				memo: formValues.memo,
				isWish: formValues.isWish,
				categoryId: null,
			}),
		);
	};

	const openMemoInNewTab = (isWish: boolean) => {
		const memoWishListUrl = getMemoUrl({
			id: memoData?.id,
			isWish,
		});
		Tab.create({ url: memoWishListUrl });
	};

	const showWishToast = (isWish: boolean) => {
		toast({
			title: getWishToastTitle(isWish),
			action: (
				<ToastAction
					altText={I18n.get("go_to")}
					onClick={() => openMemoInNewTab(isWish)}
				>
					{I18n.get("go_to")}
				</ToastAction>
			),
		});
	};

	const handleWishClick = async () => {
		const newIsWish = !formValues.isWish;
		setValue("isWish", newIsWish);

		await saveMemo({
			memo: formValues.memo,
			isWish: newIsWish,
			categoryId: formValues.categoryId,
		});

		showWishToast(newIsWish);
	};

	const getCategoryColor = (categoryId: number | null) => {
		return categories?.find((c) => c.id === categoryId)?.color || "#888888";
	};

	const getCategoryName = (categoryId: number | null) => {
		return categories?.find((c) => c.id === categoryId)?.name;
	};

	const shouldShowSavingIndicator = isSaving;
	const shouldShowSavedIndicator = !isSaving && formValues.memo;
	const shouldShowCategoryBadge = formValues.categoryId !== null;

	return (
		<form className="relative flex h-full flex-col gap-1 py-1">
			<Textarea
				{...register("memo", {
					onChange: handleMemoChange,
				})}
				{...rest}
				ref={(e) => {
					ref(e);
					textareaRef.current = e;
				}}
				onKeyDown={handleKeyDown}
				className={cn("flex-1 resize-none text-sm outline-none")}
				id="memo-textarea"
				placeholder={I18n.get("memo")}
			/>
			{showCategoryList && (
				<div
					className="fixed z-50 w-64 rounded-md bg-white shadow-lg"
					style={{
						top: `${categoryInputPosition.top}px`,
						left: `${categoryInputPosition.left}px`,
					}}
				>
					<Command>
						<CommandInput
							ref={commandInputRef}
							placeholder={I18n.get("search_category")}
							onKeyDown={(event) => {
								if (event.key === "Escape") {
									handleCategoryListEscape();
								}
							}}
						/>
						<CommandList>
							<CommandEmpty>{I18n.get("no_categories_found")}</CommandEmpty>
							<CommandGroup>
								{categories?.map((category) => (
									<CommandItem
										key={category.id}
										onSelect={() => handleCategorySelect(category)}
										className="flex items-center gap-2"
									>
										<div
											className="h-3 w-3 rounded-full"
											style={{ backgroundColor: category.color || "#888888" }}
										/>
										{category.name}
									</CommandItem>
								))}
							</CommandGroup>
						</CommandList>
					</Command>
				</div>
			)}
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<HeartIcon
						size={16}
						fill={memoData?.isWish ? "pink" : ""}
						fillOpacity={memoData?.isWish ? 100 : 0}
						onClick={handleWishClick}
						role="button"
						className={cn(
							"cursor-pointer transition-transform hover:scale-110 active:scale-95",
							{
								"animate-heart-pop": memoData?.isWish,
							},
						)}
					/>
					<div className="flex items-center gap-1">
						{shouldShowSavingIndicator && (
							<>
								<Loader2Icon className="w-3 h-3 animate-spin text-muted-foreground" />
								<span className="text-xs text-muted-foreground">
									저장 중...
								</span>
							</>
						)}
						{shouldShowSavedIndicator && (
							<>
								<CheckIcon className="w-3 h-3 text-green-500" />
								<span className="text-xs text-green-600">저장됨</span>
							</>
						)}
					</div>
				</div>
				{shouldShowCategoryBadge && (
					<Badge
						variant="outline"
						className="flex items-center gap-1 px-2 py-0.5"
					>
						<div
							className="h-2 w-2 rounded-full"
							style={{
								backgroundColor: getCategoryColor(formValues.categoryId),
							}}
						/>
						{getCategoryName(formValues.categoryId)}
						<XIcon
							size={12}
							className="hover:text-destructive ml-1 cursor-pointer"
							onClick={handleCategoryRemove}
						/>
					</Badge>
				)}
			</div>
		</form>
	);
}

export default withAuthentication(MemoForm);
