import ResizeHandle from "@src/components/ResizeHandle";
import withAuthentication from "@src/hoc/withAuthentication";
import type { MemoInput } from "@src/types/Input";
import { getMemoUrl, type IFMemoUrlParams } from "@src/utils";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY, type TMemoStatusKey } from "@web-memo/shared/constants";
import { useSettingQuery, useSupabaseUserQuery } from "@web-memo/shared/hooks";
import { analytics } from "@web-memo/shared/modules/analytics";
import { bridge } from "@web-memo/shared/modules/extension-bridge";
import { I18n, Tab } from "@web-memo/shared/utils/extension";
import {
	badgeVariants,
	cn,
	Input,
	Textarea,
	ToastAction,
	toast,
} from "@web-memo/ui";
import {
	BookOpenIcon,
	HeartIcon,
	LinkIcon,
	Loader2Icon,
	StarIcon,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import {
	CategoryAddChip,
	CategoryBadge,
	CategoryCommandPopup,
	PastMemoNotice,
	SaveStatus,
} from "./components";
import {
	type TMemoFieldKey,
	useCategorySuggestion,
	useMemoCategory,
	useMemoFieldResize,
	useMemoForm,
} from "./hooks";

function MemoFormContent() {
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);
	const queryClient = useQueryClient();
	const { register, watch } = useFormContext<MemoInput>();
	const { ref, ...rest } = register("memo");

	const currentCategoryId = watch("categoryId");
	const { user } = useSupabaseUserQuery();
	const setting = useSettingQuery();
	const { showImpression, showActionItem } = setting;
	const userId = user.data.user?.id;

	useEffect(() => {
		return bridge.handle.SETTING_UPDATED((payload) => {
			if (payload.userId !== userId) {
				return;
			}

			void queryClient.invalidateQueries({ queryKey: QUERY_KEY.setting() });
		});
	}, [queryClient, userId]);

	const visibleFieldKeys: TMemoFieldKey[] = ["memo"];
	if (showImpression) {
		visibleFieldKeys.push("impression");
	}
	if (showActionItem) {
		visibleFieldKeys.push("actionItem");
	}

	const { fieldRatios, resizingFieldKey, handleResizeStart } =
		useMemoFieldResize({ visibleFieldKeys });

	const {
		memoData,
		isSaving,
		handleTitleChange,
		handleTitleSyncClick,
		isTitleSyncAvailable,
		handleMemoChange,
		handleImpressionChange,
		handleActionItemChange,
		updateCategory,
		toggleMemoStatus,
	} = useMemoForm();

	const {
		categories,
		showCategoryList,
		categoryInputPosition,
		commandInputRef,
		categoryPopupRef,
		categoryBadgeButtonRef,
		categoryAddChipRef,
		handleKeyDown,
		handleCategoryButtonClick,
		handleCategorySelect,
		handleCategoryRemove,
		handleCategoryListClose,
		handleCategoryCreate,
		isCategoryCreating,
	} = useMemoCategory({
		textareaRef,
		onCategoryChange: updateCategory,
	});

	const {
		isLoading: isSuggestingCategory,
		triggerSuggestion,
		dismissCurrentUrl,
	} = useCategorySuggestion({
		currentCategoryId,
		onCategorySelect: updateCategory,
	});

	const handleCategoryRemoveClick = () => {
		handleCategoryRemove();
		dismissCurrentUrl();
	};

	const handleMemoStatusClick = async (statusKey: TMemoStatusKey) => {
		const nextStatusValue = await toggleMemoStatus(statusKey);
		const isSaveFailed = nextStatusValue === null;

		// 실패는 MutationCache가 이미 토스트로 알렸다. 여기서 할 일은 그 위에 성공 토스트를 덮지 않는 것뿐이다.
		if (isSaveFailed) {
			return;
		}

		const toastMessageKey = {
			isWish: nextStatusValue ? "wish_list_added" : "wish_list_deleted",
			isStar: nextStatusValue ? "star_added" : "star_deleted",
			isReading: nextStatusValue ? "reading_added" : "reading_deleted",
		}[statusKey];

		const navigateToMemoList = () => {
			const memoUrlParams: IFMemoUrlParams = { id: memoData?.id };
			memoUrlParams[statusKey] = nextStatusValue;

			analytics.trackEvent({
				name: "open_web_from_extension",
				params: { from: "side_panel_toast" },
			});
			Tab.create({ url: getMemoUrl(memoUrlParams) });
		};

		toast({
			title: I18n.get(toastMessageKey),
			action: (
				<ToastAction altText={I18n.get("go_to")} onClick={navigateToMemoList}>
					{I18n.get("go_to")}
				</ToastAction>
			),
		});
	};

	const currentCategory = categories?.find(
		(category) => category.id === currentCategoryId,
	);

	return (
		<>
			<PastMemoNotice hasMemoData={!!memoData?.created_at} />
			<form className="relative flex min-h-0 flex-1 flex-col py-1">
				<div className="mb-1 flex shrink-0 items-center gap-1">
					{setting.isRefetchError && (
						<button
							type="button"
							className="text-xs text-destructive underline"
							onClick={() => void setting.refetch()}
						>
							{I18n.get("retry")}
						</button>
					)}
					<Input
						id="memo-title-input"
						className="h-8 min-w-0 border-none px-0 text-sm font-bold shadow-none focus-visible:ring-0"
						placeholder={I18n.get("titlePlaceholder")}
						{...register("title", {
							onChange: (event) => handleTitleChange(event.target.value),
						})}
					/>
					<button
						type="button"
						className="shrink-0 rounded p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-50"
						aria-label={I18n.get("memo_title_sync")}
						title={I18n.get("memo_title_sync")}
						disabled={!isTitleSyncAvailable}
						onClick={handleTitleSyncClick}
					>
						<LinkIcon className="size-4" aria-hidden="true" />
					</button>
				</div>
				<div
					className="flex min-h-0 flex-col"
					style={{ flexGrow: fieldRatios.memo, flexBasis: 0 }}
				>
					<Textarea
						id="memo-textarea"
						// 드래그 중에는 framer-motion 레이아웃 애니메이션이 매 프레임 다시 시작돼 핸들을 따라오지 못한다.
						layout={resizingFieldKey === null}
						onKeyDown={handleKeyDown}
						className="min-h-0 flex-1 resize-none text-sm outline-none"
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
				</div>
				{showImpression && (
					<>
						<ResizeHandle
							upperSectionRatio={fieldRatios.memo}
							isResizing={resizingFieldKey === "impression"}
							onMouseDown={(event) => handleResizeStart(event, "impression")}
						/>
						<div
							className="flex min-h-0 flex-col gap-1"
							style={{ flexGrow: fieldRatios.impression, flexBasis: 0 }}
						>
							<label
								htmlFor="impression-textarea"
								className="text-muted-foreground shrink-0 text-xs font-semibold"
							>
								{I18n.get("impression")}
							</label>
							<Textarea
								id="impression-textarea"
								// 드래그 중에는 framer-motion 레이아웃 애니메이션이 매 프레임 다시 시작돼 핸들을 따라오지 못한다.
								layout={resizingFieldKey === null}
								className="min-h-0 flex-1 resize-none text-sm outline-none"
								placeholder={I18n.get("impressionPlaceholder")}
								{...register("impression", {
									onChange: (event) =>
										handleImpressionChange(event.target.value),
								})}
							/>
						</div>
					</>
				)}
				{showActionItem && (
					<>
						<ResizeHandle
							upperSectionRatio={
								showImpression ? fieldRatios.impression : fieldRatios.memo
							}
							isResizing={resizingFieldKey === "actionItem"}
							onMouseDown={(event) => handleResizeStart(event, "actionItem")}
						/>
						<div
							className="flex min-h-0 flex-col gap-1"
							style={{ flexGrow: fieldRatios.actionItem, flexBasis: 0 }}
						>
							<label
								htmlFor="action-item-textarea"
								className="text-muted-foreground shrink-0 text-xs font-semibold"
							>
								{I18n.get("actionItem")}
							</label>
							<Textarea
								id="action-item-textarea"
								// 드래그 중에는 framer-motion 레이아웃 애니메이션이 매 프레임 다시 시작돼 핸들을 따라오지 못한다.
								layout={resizingFieldKey === null}
								className="min-h-0 flex-1 resize-none text-sm outline-none"
								placeholder={I18n.get("actionItemPlaceholder")}
								{...register("actionItem", {
									onChange: (event) =>
										handleActionItemChange(event.target.value),
								})}
							/>
						</div>
					</>
				)}
				<div className="flex shrink-0 items-center justify-between gap-2 pt-2">
					<div className="flex items-center gap-2">
						<MemoStatusToggle
							label={I18n.get("wish_list")}
							isOn={!!memoData?.isWish}
							onClick={() => handleMemoStatusClick("isWish")}
						>
							<HeartIcon
								size={16}
								fill={memoData?.isWish ? "currentColor" : ""}
								fillOpacity={memoData?.isWish ? 100 : 0}
								className={cn({
									"animate-heart-pop text-pink-500": memoData?.isWish,
								})}
							/>
						</MemoStatusToggle>
						<MemoStatusToggle
							label={I18n.get("important_memo")}
							isOn={!!memoData?.isStar}
							onClick={() => handleMemoStatusClick("isStar")}
						>
							<StarIcon
								size={16}
								fill={memoData?.isStar ? "currentColor" : ""}
								fillOpacity={memoData?.isStar ? 100 : 0}
								className={cn({ "text-amber-500": memoData?.isStar })}
							/>
						</MemoStatusToggle>
						<MemoStatusToggle
							label={I18n.get("reading_memo")}
							isOn={!!memoData?.isReading}
							onClick={() => handleMemoStatusClick("isReading")}
						>
							<BookOpenIcon
								size={16}
								className={cn({ "text-emerald-500": memoData?.isReading })}
							/>
						</MemoStatusToggle>
						<SaveStatus isSaving={isSaving} memo={watch("memo")} />
					</div>
					<div className="flex items-center gap-2">
						{currentCategory ? (
							<CategoryBadge
								category={currentCategory}
								badgeButtonRef={categoryBadgeButtonRef}
								onBadgeButtonClick={handleCategoryButtonClick}
								onRemoveButtonClick={handleCategoryRemoveClick}
							/>
						) : isSuggestingCategory ? (
							// 추천 중에는 칩 자리를 대신해, 곧 카테고리가 붙는다는 걸 같은 자리에서 보여 준다.
							<div
								data-testid="category-suggesting"
								className={cn(
									badgeVariants({ variant: "outline" }),
									"text-muted-foreground gap-1 border-dashed px-2 py-0.5",
								)}
							>
								<Loader2Icon size={12} className="animate-spin" />
								{I18n.get("category_suggesting")}
							</div>
						) : (
							<CategoryAddChip
								chipRef={categoryAddChipRef}
								onChipClick={handleCategoryButtonClick}
							/>
						)}
					</div>
				</div>
			</form>

			{showCategoryList && (
				<CategoryCommandPopup
					popupRef={categoryPopupRef}
					commandInputRef={commandInputRef}
					position={categoryInputPosition}
					categories={categories}
					currentCategoryId={currentCategoryId}
					onCategorySelect={handleCategorySelect}
					onEscapeKeyDown={handleCategoryListClose}
					onWebLinkSelect={handleCategoryListClose}
					onCategoryCreate={handleCategoryCreate}
					isCategoryCreating={isCategoryCreating}
				/>
			)}
		</>
	);
}

function MemoForm() {
	const form = useForm<MemoInput>({
		shouldUnregister: false,
		defaultValues: {
			title: "",
			memo: "",
			impression: "",
			actionItem: "",
			isWish: false,
			isStar: false,
			isReading: false,
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

interface IFMemoStatusToggleProps {
	/** 스크린 리더가 읽을 이름 */
	label: string;
	/** 켜져 있는지. aria-pressed 로 전달해 토글임을 알린다 */
	isOn: boolean;
	onClick: () => void;
	children: React.ReactNode;
}

/**
 * 메모 상태(위시·중요·읽는 중)를 켜고 끄는 토글
 *
 * @description
 * 아이콘에 role="button" 만 얹혀 있어 키보드로는 닿지도 눌리지도 않았다.
 * 진짜 button 을 쓰면 포커스·Enter/Space·포커스 링이 전부 딸려 온다.
 */
function MemoStatusToggle({
	label,
	isOn,
	onClick,
	children,
}: IFMemoStatusToggleProps) {
	return (
		<button
			type="button"
			aria-label={label}
			aria-pressed={isOn}
			onClick={onClick}
			className="focus-visible:ring-ring rounded-sm transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-1 active:scale-95"
		>
			{children}
		</button>
	);
}
