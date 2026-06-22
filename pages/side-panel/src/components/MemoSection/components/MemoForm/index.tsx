import withAuthentication from "@src/hoc/withAuthentication";
import type { MemoInput } from "@src/types/Input";
import { getMemoUrl } from "@src/utils";
import { I18n, Tab } from "@web-memo/shared/utils/extension";
import {
	Badge,
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	cn,
	Textarea,
	ToastAction,
	toast,
} from "@web-memo/ui";
import { HeartIcon, Loader2Icon, StarIcon, XIcon } from "lucide-react";
import { useMemo, useRef } from "react";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import { SaveStatus } from "./components";
import { useCategorySuggestion, useMemoCategory, useMemoForm } from "./hooks";

function MemoFormContent() {
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);
	const { register, watch } = useFormContext<MemoInput>();
	const { ref, ...rest } = register("memo");

	const currentCategoryId = watch("categoryId");

	const {
		memoData,
		isSaving,
		handleMemoChange,
		handleImpressionChange,
		handleActionItemChange,
		updateCategory,
		toggleWish,
		toggleStar,
	} = useMemoForm();

	const {
		categories,
		showCategoryList,
		categoryInputPosition,
		commandInputRef,
		handleKeyDown,
		handleCategorySelect,
		handleCategoryRemove,
		handleCategoryListClose,
	} = useMemoCategory({
		textareaRef,
		onCategoryChange: updateCategory,
	});

	const { isLoading: isSuggestingCategory, triggerSuggestion } =
		useCategorySuggestion({
			currentCategoryId,
			onCategorySelect: updateCategory,
		});

	const handleWishClick = async () => {
		const newIsWish = await toggleWish();

		const navigateWish = () => {
			const url = getMemoUrl({
				id: memoData?.id,
				isWish: newIsWish,
			});
			Tab.create({ url });
		};

		toast({
			title: newIsWish
				? I18n.get("wish_list_added")
				: I18n.get("wish_list_deleted"),
			action: (
				<ToastAction altText={I18n.get("go_to")} onClick={navigateWish}>
					{I18n.get("go_to")}
				</ToastAction>
			),
		});
	};

	const handleStarClick = async () => {
		const newIsStar = await toggleStar();

		const navigateStar = () => {
			const url = getMemoUrl({
				id: memoData?.id,
				isStar: newIsStar,
			});
			Tab.create({ url });
		};

		toast({
			title: newIsStar ? I18n.get("star_added") : I18n.get("star_deleted"),
			action: (
				<ToastAction altText={I18n.get("go_to")} onClick={navigateStar}>
					{I18n.get("go_to")}
				</ToastAction>
			),
		});
	};

	const currentCategory = useMemo(
		() => categories?.find((c) => c.id === currentCategoryId),
		[categories, currentCategoryId],
	);

	return (
		<>
			<form className="relative flex h-full flex-col gap-1 py-1">
				<Textarea
					id="memo-textarea"
					onKeyDown={handleKeyDown}
					className="flex-1 resize-none text-sm outline-none"
					placeholder={I18n.get("memo")}
					{...register("memo", {
						onChange: (event) => {
							handleMemoChange(event.target.value);

							const hasMemoData = !!memoData?.created_at;
							const hasMemoText = !!event.target.value?.trim();
							const hasCategory = !!currentCategoryId;

							if (
								hasMemoData &&
								hasMemoText &&
								!hasCategory &&
								!isSuggestingCategory
							) {
								triggerSuggestion(event.target.value);
							}
						},
					})}
					{...rest}
					ref={(e) => {
						ref(e);
						textareaRef.current = e;
					}}
				/>
				<label htmlFor="impression-textarea" className="mt-3 text-xs font-semibold text-gray-500">
					{I18n.get("impression")}
				</label>
				<Textarea
					id="impression-textarea"
					className="resize-none text-sm outline-none"
					placeholder={I18n.get("impressionPlaceholder")}
					{...register("impression", {
						onChange: (event) => handleImpressionChange(event.target.value),
					})}
				/>
				<label htmlFor="action-item-textarea" className="mt-3 text-xs font-semibold text-gray-500">
					{I18n.get("actionItem")}
				</label>
				<Textarea
					id="action-item-textarea"
					className="resize-none text-sm outline-none"
					placeholder={I18n.get("actionItemPlaceholder")}
					{...register("actionItem", {
						onChange: (event) => handleActionItemChange(event.target.value),
					})}
				/>
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
						<StarIcon
							size={16}
							fill={memoData?.isStar ? "#f59e0b" : ""}
							fillOpacity={memoData?.isStar ? 100 : 0}
							onClick={handleStarClick}
							role="button"
							className={cn(
								"cursor-pointer transition-transform hover:scale-110 active:scale-95",
								{
									"text-amber-500": memoData?.isStar,
								},
							)}
						/>
						<SaveStatus isSaving={isSaving} memo={watch("memo")} />
					</div>
					<div className="flex items-center gap-2">
						{isSuggestingCategory && (
							<div className="flex items-center gap-1 text-xs text-muted-foreground">
								<Loader2Icon size={12} className="animate-spin" />
								{I18n.get("category_suggesting")}
							</div>
						)}
						{currentCategory && (
							<Badge
								variant="outline"
								className="flex items-center gap-1 px-2 py-0.5"
							>
								<div
									className="h-2 w-2 rounded-full"
									style={{
										backgroundColor: currentCategory.color || "#888888",
									}}
								/>
								{currentCategory.name}
								<XIcon
									size={12}
									className="hover:text-destructive ml-1 cursor-pointer"
									onClick={handleCategoryRemove}
								/>
							</Badge>
						)}
					</div>
				</div>
			</form>

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
									handleCategoryListClose();
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
		</>
	);
}

function MemoForm() {
	const form = useForm<MemoInput>({
		defaultValues: {
			memo: "",
			impression: "",
			actionItem: "",
			isWish: false,
			isStar: false,
			categoryId: null,
		},
	});

	return (
		<FormProvider {...form}>
			<MemoFormContent />
		</FormProvider>
	);
}

export default withAuthentication(MemoForm);
