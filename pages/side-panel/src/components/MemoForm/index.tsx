import withAuthentication from "@src/hoc/withAuthentication";
import type { MemoInput } from "@src/types/Input";
import { useDebounce } from "@web-memo/shared/hooks";
import { I18n } from "@web-memo/shared/utils/extension";
import {
	Badge,
	Button,
	cn,
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	Textarea,
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@web-memo/ui";
import { HeartIcon, SparklesIcon, XIcon } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import { CategorySuggestion, SaveStatus } from "./components";
import {
	useCategorySuggestion,
	useMemoCategory,
	useMemoForm,
	useMemoWish,
} from "./hooks";

const SUGGESTION_TRIGGER_DELAY = 300;

function MemoFormContent() {
	const { debounce } = useDebounce();
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);
	const { register, watch, setValue } = useFormContext<MemoInput>();
	const { ref, ...rest } = register("memo");

	const currentCategoryId = watch("categoryId");

	const [isFirstSave, setIsFirstSave] = useState(true);

	const { memoData, isSaving, saveMemo, handleMemoChange } = useMemoForm({
		onSaveSuccess: (memoInput) => {
			// Trigger category suggestion on first save if no category is set
			if (!memoInput.categoryId && isFirstSave) {
				setIsFirstSave(false);
				// Small delay to let save complete visually
				setTimeout(() => {
					triggerSuggestion(memoInput.memo);
				}, SUGGESTION_TRIGGER_DELAY);
			}
		},
	});

	const handleCategorySelect = useCallback(
		(categoryId: number) => {
			setValue("categoryId", categoryId);
			saveMemo({
				memo: watch("memo"),
				isWish: watch("isWish"),
				categoryId,
			});
		},
		[setValue, saveMemo, watch],
	);

	const {
		isLoading: isSuggestionLoading,
		suggestion,
		triggerSuggestion,
		triggerSuggestionByPageContent,
		acceptSuggestion,
		dismissSuggestion,
	} = useCategorySuggestion({
		currentCategoryId,
		onCategorySelect: handleCategorySelect,
	});

	const { handleWishClick } = useMemoWish({
		memoId: memoData?.id,
		onWishClick: async (isWish) => {
			await saveMemo({
				memo: watch("memo"),
				isWish: !isWish,
				categoryId: watch("categoryId"),
			});
		},
	});

	const handleCategoryChange = (categoryId: number | null) => {
		debounce(() =>
			saveMemo({
				memo: watch("memo"),
				isWish: watch("isWish"),
				categoryId,
			}),
		);
	};

	const {
		categories,
		showCategoryList,
		categoryInputPosition,
		commandInputRef,
		handleKeyDown,
		handleCategorySelect: handleCategorySelectFromList,
		handleCategoryRemove,
		handleCategoryListClose,
	} = useMemoCategory({
		textareaRef,
		onCategorySelect: (categoryId) => {
			saveMemo({
				memo: watch("memo"),
				isWish: watch("isWish"),
				categoryId,
			});
		},
		onCategoryRemove: () => {
			handleCategoryChange(null);
		},
	});

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
						},
					})}
					{...rest}
					ref={(e) => {
						ref(e);
						textareaRef.current = e;
					}}
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
						<SaveStatus isSaving={isSaving} memo={watch("memo")} />
					</div>
					<div className="flex items-center gap-2">
						{/* Category Suggestion */}
						{(isSuggestionLoading || suggestion) && !currentCategoryId && (
							<CategorySuggestion
								isLoading={isSuggestionLoading}
								suggestion={suggestion}
								onAccept={acceptSuggestion}
								onDismiss={dismissSuggestion}
							/>
						)}
						{/* Category Recommend Button */}
						{!currentCategoryId && !isSuggestionLoading && !suggestion && (
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="h-6 w-6"
												onClick={triggerSuggestionByPageContent}
											>
												<SparklesIcon size={14} />
											</Button>
										</TooltipTrigger>
										<TooltipContent>
											<p>{I18n.get("recommend_category")}</p>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							)}
						{/* Current Category Badge */}
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
										onSelect={() => handleCategorySelectFromList(category)}
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
			isWish: false,
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
