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
	Textarea,
	ToastAction,
	cn,
	toast,
} from "@web-memo/ui";
import { HeartIcon, XIcon } from "lucide-react";
import { useMemo, useRef } from "react";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import { SaveStatus } from "./components";
import { useMemoCategory, useMemoForm } from "./hooks";

function MemoFormContent() {
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);
	const { register, watch } = useFormContext<MemoInput>();
	const { ref, ...rest } = register("memo");

	const currentCategoryId = watch("categoryId");

	const { memoData, isSaving, handleMemoChange, updateCategory, toggleWish } =
		useMemoForm();

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
