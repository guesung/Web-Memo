import withAuthentication from "@src/hoc/withAuthentication";
import type { MemoInput } from "@src/types/Input";
import { useDebounce } from "@web-memo/shared/hooks";
import { I18n } from "@web-memo/shared/utils/extension";
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
} from "@web-memo/ui";
import { HeartIcon, XIcon } from "lucide-react";
import { useMemo, useRef } from "react";
import { FormProvider, useForm, useFormContext, useWatch } from "react-hook-form";
import { SaveStatus } from "./components";
import { useMemoCategory, useMemoForm, useMemoWish } from "./hooks";

function MemoFormContent() {
	const { debounce } = useDebounce();
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);
	const { register, control, getValues } = useFormContext<MemoInput>();
	const { ref, ...rest } = register("memo");

	// useWatch로 특정 필드만 구독하여 불필요한 리렌더링 방지
	const memoValue = useWatch({ control, name: "memo" });
	const isWishValue = useWatch({ control, name: "isWish" });
	const categoryIdValue = useWatch({ control, name: "categoryId" });

	const { memoData, isSaving, saveMemo, handleMemoChange } = useMemoForm();

	const { handleWishClick } = useMemoWish({
		memoId: memoData?.id,
		onWishClick: async (isWish) => {
			await saveMemo({
				memo: getValues("memo"),
				isWish: !isWish,
				categoryId: getValues("categoryId"),
			});
		},
	});

	const handleCategoryChange = (categoryId: number | null) => {
		debounce(() =>
			saveMemo({
				memo: getValues("memo"),
				isWish: getValues("isWish"),
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
		handleCategorySelect,
		handleCategoryRemove,
		handleCategoryListClose,
	} = useMemoCategory({
		textareaRef,
		onCategorySelect: (categoryId) => {
			saveMemo({
				memo: getValues("memo"),
				isWish: getValues("isWish"),
				categoryId,
			});
		},
		onCategoryRemove: () => {
			handleCategoryChange(null);
		},
	});

	// 카테고리 정보 메모이제이션
	const selectedCategory = useMemo(() => {
		if (!categoryIdValue || !categories) return null;
		return categories.find((c) => c.id === categoryIdValue);
	}, [categoryIdValue, categories]);

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
						<SaveStatus isSaving={isSaving} memo={memoValue} />
					</div>
					{selectedCategory && (
						<Badge
							variant="outline"
							className="flex items-center gap-1 px-2 py-0.5"
						>
							<div
								className="h-2 w-2 rounded-full"
								style={{
									backgroundColor: selectedCategory.color || "#888888",
								}}
							/>
							{selectedCategory.name}
							<XIcon
								size={12}
								className="hover:text-destructive ml-1 cursor-pointer"
								onClick={handleCategoryRemove}
							/>
						</Badge>
					)}
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
