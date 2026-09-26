import ResizeHandle from "@src/components/ResizeHandle";
import type { MemoInput } from "@src/types/Input";
import { getMemoUrl, type IFMemoUrlParams } from "@src/utils";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY, type TMemoStatusKey } from "@web-memo/shared/constants";
import { useSettingQuery, useSupabaseUserQuery } from "@web-memo/shared/hooks";
import { analytics } from "@web-memo/shared/modules/analytics";
import { bridge } from "@web-memo/shared/modules/extension-bridge";
import type { Database } from "@web-memo/shared/types";
import { I18n, Tab } from "@web-memo/shared/utils/extension";
import {
	badgeVariants,
	cn,
	Input,
	Textarea,
	ToastAction,
	toast,
} from "@web-memo/ui";
import { BookOpenIcon, HeartIcon, Loader2Icon, StarIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import {
	CategoryAddChip,
	CategoryBadge,
	CategoryCommandPopup,
	CategorySuggestion,
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

function MemoFormContent({
	selectedMemo,
	onOtherMemoClick,
	isSelectedMemoMissing,
}: IFMemoFormProps) {
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);
	const [isSwitching, setIsSwitching] = useState(false);
	const queryClient = useQueryClient();
	const { register, watch, getValues } = useFormContext<MemoInput>();
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
		isMemoLocked,
		isMemoError,
		refetchMemo,
		saveStatus,
		handleSaveRetryClick,
		isWritePending,
		saveBeforeSwitch,
		handleTitleChange,
		handleMemoChange,
		handleImpressionChange,
		handleActionItemChange,
		updateCategory,
		toggleMemoStatus,
	} = useMemoForm({ selectedMemo });
	// 겉모습(로딩 문구·버튼 흐림)만 200ms 지연시킨다. 편집·저장 차단은 isMemoLocked로 즉시 적용된다.
	const isMemoLoadingVisible = useDelayedFlag(
		isMemoLocked && !isMemoError,
		200,
	);
	const isMemoUiDimmed = isMemoError || isMemoLoadingVisible;

	const handleOtherMemoClick = async () => {
		if (!onOtherMemoClick || isMemoLocked || isWritePending || isSwitching) {
			return;
		}
		if (isSelectedMemoMissing) {
			onOtherMemoClick(getValues());
			return;
		}

		setIsSwitching(true);
		const isSaved = await saveBeforeSwitch();
		if (isSaved) {
			onOtherMemoClick();
			return;
		}

		setIsSwitching(false);
	};

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
		isMemoLocked,
	});

	const {
		isLoading: isSuggestingCategory,
		suggestion,
		isAccepting,
		triggerSuggestion,
		acceptSuggestion,
		dismissSuggestion,
		pauseAutoDismiss,
		resumeAutoDismiss,
		dismissCurrentUrl,
	} = useCategorySuggestion({
		currentCategoryId,
		currentMemoId: memoData?.id ?? null,
		onCategorySelect: updateCategory,
		onCategoryAutoApply: (categoryName, onUndo) => {
			toast({
				title: I18n.get("category_auto_applied", categoryName),
				action: (
					<ToastAction
						altText={I18n.get("category_auto_applied_undo")}
						onClick={() => void onUndo()}
					>
						{I18n.get("category_auto_applied_undo")}
					</ToastAction>
				),
			});
		},
	});

	const handleCategoryRemoveClick = () => {
		handleCategoryRemove();
		void dismissCurrentUrl();
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
			{isSelectedMemoMissing && (
				<p role="alert" className="text-xs text-destructive">
					{I18n.get("memo_candidates_selection_lost")}
				</p>
			)}
			{onOtherMemoClick && (
				<button
					type="button"
					className={cn(
						"min-h-8 self-start rounded px-2 py-1 text-xs text-muted-foreground underline hover:text-foreground",
						// 잠금으로 막힌 경우는 200ms 뒤에만 흐리게 한다. 저장 중 차단은 기존처럼 바로 흐리게 한다.
						(isWritePending || isSwitching || isMemoUiDimmed) && "opacity-50",
					)}
					disabled={isMemoLocked || isWritePending || isSwitching}
					onClick={handleOtherMemoClick}
				>
					{I18n.get("memo_choose_other")}
				</button>
			)}
			{!isMemoLocked && <PastMemoNotice hasMemoData={!!memoData?.created_at} />}
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
						readOnly={isMemoLocked}
						{...register("title", {
							onChange: (event) => handleTitleChange(event.target.value),
						})}
					/>
				</div>
				<div
					className="relative flex min-h-0 flex-col"
					style={{ flexGrow: fieldRatios.memo, flexBasis: 0 }}
				>
					<Textarea
						id="memo-textarea"
						// 드래그 중에는 framer-motion 레이아웃 애니메이션이 매 프레임 다시 시작돼 핸들을 따라오지 못한다.
						layout={resizingFieldKey === null}
						onKeyDown={handleKeyDown}
						className="min-h-0 flex-1 resize-none text-sm outline-none"
						placeholder={isMemoLocked ? "" : I18n.get("memo")}
						readOnly={isMemoLocked}
						aria-busy={isMemoLocked || undefined}
						{...register("memo", {
							onChange: (event) => {
								handleMemoChange(event.target.value);

								const hasMemoData = !!memoData?.created_at;
								const hasMemoText = !!event.target.value?.trim();
								const hasCategory = !!currentCategoryId;

								if (
									!isMemoLocked &&
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
					{isMemoError ? (
						<div
							// biome-ignore lint/a11y/useSemanticElements: output은 phrasing content만 담을 수 있어 버튼을 담지 못한다
							role="status"
							className="pointer-events-none absolute left-3 top-2 flex items-center gap-2 text-xs text-destructive"
						>
							{I18n.get("memo_load_error")}
							<button
								type="button"
								className="pointer-events-auto underline"
								onClick={() => void refetchMemo()}
							>
								{I18n.get("retry")}
							</button>
						</div>
					) : (
						isMemoLoadingVisible && (
							<output className="pointer-events-none absolute left-3 top-2 flex items-center gap-1 text-xs text-muted-foreground">
								<Loader2Icon size={12} className="animate-spin" />
								{I18n.get("memo_loading")}
							</output>
						)
					)}
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
								placeholder={
									isMemoLocked ? "" : I18n.get("impressionPlaceholder")
								}
								readOnly={isMemoLocked}
								aria-busy={isMemoLocked || undefined}
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
								placeholder={
									isMemoLocked ? "" : I18n.get("actionItemPlaceholder")
								}
								readOnly={isMemoLocked}
								aria-busy={isMemoLocked || undefined}
								{...register("actionItem", {
									onChange: (event) =>
										handleActionItemChange(event.target.value),
								})}
							/>
						</div>
					</>
				)}
				{suggestion && !currentCategoryId && (
					<div className="flex shrink-0 justify-end pt-2">
						<CategorySuggestion
							suggestion={suggestion}
							isAccepting={isAccepting}
							onAccept={() => void acceptSuggestion()}
							onDismiss={dismissSuggestion}
							onPauseDismiss={pauseAutoDismiss}
							onResumeDismiss={resumeAutoDismiss}
						/>
					</div>
				)}
				<div className="flex shrink-0 items-center justify-between gap-2 pt-2">
					<div className="flex min-w-0 items-center gap-2">
						<MemoStatusToggle
							label={I18n.get("wish_list")}
							isOn={!!memoData?.isWish}
							isDisabled={isMemoLocked}
							isDimmed={isMemoUiDimmed}
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
							isDisabled={isMemoLocked}
							isDimmed={isMemoUiDimmed}
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
							isDisabled={isMemoLocked}
							isDimmed={isMemoUiDimmed}
							onClick={() => handleMemoStatusClick("isReading")}
						>
							<BookOpenIcon
								size={16}
								className={cn({ "text-emerald-500": memoData?.isReading })}
							/>
						</MemoStatusToggle>
						{!isMemoLocked && (
							<SaveStatus
								saveStatus={saveStatus}
								onRetryClick={handleSaveRetryClick}
							/>
						)}
					</div>
					<div className="flex items-center gap-2">
						{currentCategory ? (
							<CategoryBadge
								category={currentCategory}
								badgeButtonRef={categoryBadgeButtonRef}
								onBadgeButtonClick={handleCategoryButtonClick}
								onRemoveButtonClick={handleCategoryRemoveClick}
								isDisabled={isMemoLocked}
								isDimmed={isMemoUiDimmed}
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
								isDisabled={isMemoLocked}
								isDimmed={isMemoUiDimmed}
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

function MemoForm({
	selectedMemo,
	onOtherMemoClick,
	isSelectedMemoMissing,
}: IFMemoFormProps) {
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
			<MemoFormContent
				selectedMemo={selectedMemo}
				onOtherMemoClick={onOtherMemoClick}
				isSelectedMemoMissing={isSelectedMemoMissing}
			/>
		</FormProvider>
	);
}

export default MemoForm;

/** 선택된 메모를 편집기와 연결한다. */
interface IFMemoFormProps {
	selectedMemo?: Database["memo"]["Tables"]["memo"]["Row"];
	isSelectedMemoMissing?: boolean;
	onOtherMemoClick?: (draft?: MemoInput) => void;
}

interface IFMemoStatusToggleProps {
	/** 스크린 리더가 읽을 이름 */
	label: string;
	/** 켜져 있는지. aria-pressed 로 전달해 토글임을 알린다 */
	isOn: boolean;
	/** 메모 조회가 끝나지 않아 눌러도 반응하지 않아야 하는지 */
	isDisabled?: boolean;
	/** 잠금이 눈에 띄게 오래 지속돼 흐리게 보여줄지 */
	isDimmed?: boolean;
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
	isDisabled,
	isDimmed,
	onClick,
	children,
}: IFMemoStatusToggleProps) {
	return (
		<button
			type="button"
			aria-label={label}
			aria-pressed={isOn}
			disabled={isDisabled}
			onClick={onClick}
			className={cn(
				"focus-visible:ring-ring rounded-sm transition-transform focus-visible:outline-none focus-visible:ring-1",
				isDisabled ? "cursor-default" : "hover:scale-110 active:scale-95",
				isDimmed && "opacity-50",
			)}
		>
			{children}
		</button>
	);
}

/**
 * 값이 켜진 채 일정 시간 이상 지속될 때만 true로 바뀌는 지연 플래그.
 * @description 로딩·잠금 표시가 아주 짧게 스쳐 지나가며 깜빡이는 것을 막는다.
 * 값이 꺼지면 지연 없이 즉시 false로 돌아간다.
 */
function useDelayedFlag(flag: boolean, delayMs: number) {
	const [isDelayedFlagOn, setIsDelayedFlagOn] = useState(false);

	useEffect(() => {
		if (!flag) {
			setIsDelayedFlagOn(false);
			return;
		}

		const timerId = setTimeout(() => setIsDelayedFlagOn(true), delayMs);

		return () => clearTimeout(timerId);
	}, [flag, delayMs]);

	return isDelayedFlagOn;
}
