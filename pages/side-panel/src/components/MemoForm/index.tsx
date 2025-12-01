import withAuthentication from "@src/hoc/withAuthentication";
import type { MemoInput } from "@src/types/Input";
import { getTabInfo, I18n } from "@web-memo/shared/utils/extension";
import {
	Badge,
	cn,
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	MarkdownEditor,
	type MarkdownEditorRef,
} from "@web-memo/ui";
import { HeartIcon, XIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import { SaveStatus } from "./components";
import { useMemoCategory, useMemoForm, useMemoWish } from "./hooks";

function MemoFormContent() {
	const editorRef = useRef<MarkdownEditorRef>(null);
	const { watch } = useFormContext<MemoInput>();

	const { memoData, isSaving, saveMemo, handleMemoChange } = useMemoForm();

	useEffect(() => {
		if (editorRef.current) {
			editorRef.current.setMarkdown(memoData?.memo ?? "");
		}
	}, [memoData?.memo]);

	const { handleWishClick } = useMemoWish({
		memoId: memoData?.id,
		onWishClick: async (isWish) => {
			const tabInfo = await getTabInfo();

			await saveMemo({
				...tabInfo,
				memo: watch("memo"),
				isWish: !isWish,
				category_id: watch("categoryId"),
			});
		},
	});

	const handleCategoryChange = async (categoryId: number | null) => {
		const tabInfo = await getTabInfo();

		await saveMemo({
			...tabInfo,
			memo: watch("memo"),
			isWish: watch("isWish"),
			category_id: categoryId,
		});
	};

	const {
		categories,
		showCategoryList,
		categoryInputPosition,
		commandInputRef,
		handleCategorySelect,
		handleCategoryRemove,
		handleCategoryListClose,
	} = useMemoCategory({
		textareaRef: { current: null }, // WYSIWYG 에디터에서는 # 단축키 비활성화
		onCategorySelect: async (categoryId) => {
			const tabInfo = await getTabInfo();

			await saveMemo({
				...tabInfo,
				memo: watch("memo"),
				isWish: watch("isWish"),
				category_id: categoryId,
			});
		},
		onCategoryRemove: () => {
			handleCategoryChange(null);
		},
	});

	return (
		<>
			<form className="relative flex h-full flex-col gap-1 py-1">
				<MarkdownEditor
					ref={editorRef}
					defaultValue={memoData?.memo ?? ""}
					onChange={handleMemoChange}
					placeholder={I18n.get("memo")}
					className="flex-1"
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
					{watch("categoryId") && (
						<Badge
							variant="outline"
							className="flex items-center gap-1 px-2 py-0.5"
						>
							<div
								className="h-2 w-2 rounded-full"
								style={{
									backgroundColor:
										categories?.find((c) => c.id === watch("categoryId"))
											?.color || "#888888",
								}}
							/>
							{
								categories?.find(
									(category) => category.id === watch("categoryId"),
								)?.name
							}
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
