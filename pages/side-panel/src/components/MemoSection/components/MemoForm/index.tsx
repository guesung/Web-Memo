import ResizeHandle from "@src/components/ResizeHandle";
import { useOnlineStatus } from "@src/hooks";
import type { MemoInput } from "@src/types/Input";
import {
	getMemoUrl,
	getOfflineControlDisabledReason,
	type IFMemoUrlParams,
} from "@src/utils";
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
	getSaveStatus,
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
	isMemoLocked = false,
	isMemoLoadFailed = false,
	onMemoRetryClick,
	isSyncing = false,
	isSyncFailed = false,
	hasSyncNetworkError = false,
	onRetrySync,
}: IFMemoFormProps) {
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);
	const [isSwitching, setIsSwitching] = useState(false);
	const isOffline = !useOnlineStatus();
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
		firstSavedMemoId,
		saveStatus,
		hasPendingOfflineItem,
		handleSaveRetryClick,
		isWritePending,
		saveBeforeSwitch,
		handleTitleChange,
		handleMemoChange,
		handleImpressionChange,
		handleActionItemChange,
		updateCategory,
		toggleMemoStatus,
	} = useMemoForm({ selectedMemo, isMemoLocked, isSyncing });
	// 겉모습(로딩 문구·버튼 흐림)만 200ms 지연시킨다. 편집·저장 차단은 isMemoLocked로 즉시 적용된다.
	const isMemoLoadingVisible = useDelayedFlag(
		isMemoLocked && !isMemoLoadFailed,
		200,
	);
	const isMemoUiDimmed = isMemoLoadFailed || isMemoLoadingVisible;
	// 오프라인·동기화 중에는 잠금과 같은 자리에서 카테고리·토글·# 팝업·AI 추천을 막는다.
	// 잠금(isMemoLocked)과 겹치면 잠금이 우선이라 사유 문구는 잠금이 아닐 때만 보여준다.
	const isControlsDisabled = isOffline || isSyncing;
	const changeDisabledReason = isMemoLocked
		? undefined
		: getOfflineControlDisabledReason({
				isOffline,
				isSyncing,
				kind: "change",
			});
	const displaySaveStatus = getSaveStatus({
		saveStatus,
		isOffline,
		hasPendingOfflineItem,
		hasSyncNetworkError,
		isSyncFailed,
	});

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
		firstSavedMemoId,
		isFirstSavedMemoReady:
			!isMemoLocked &&
			!isControlsDisabled &&
			!isWritePending &&
			saveStatus === "saved",
		onCategorySelect: updateCategory,
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
						onKeyDown={(event) => {
							// 오프라인·동기화 중에는 #을 눌러도 팝업 없이 문자만 입력되게 둔다.
							if (isControlsDisabled) {
								return;
							}
							handleKeyDown(event);
						}}
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
									!isControlsDisabled &&
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
					{isMemoLoadFailed ? (
						<div
							// biome-ignore lint/a11y/useSemanticElements: output은 phrasing content만 담을 수 있어 버튼을 담지 못한다
							role="status"
							className="pointer-events-none absolute left-3 top-2 flex items-center gap-2 text-xs text-destructive"
						>
							{I18n.get("memo_load_error")}
							<button
								type="button"
								className="pointer-events-auto underline"
								onClick={() => void onMemoRetryClick?.()}
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
							isDisabled={isMemoLocked || isControlsDisabled}
							isDimmed={isMemoUiDimmed || isControlsDisabled}
							title={changeDisabledReason}
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
							isDisabled={isMemoLocked || isControlsDisabled}
							isDimmed={isMemoUiDimmed || isControlsDisabled}
							title={changeDisabledReason}
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
							isDisabled={isMemoLocked || isControlsDisabled}
							isDimmed={isMemoUiDimmed || isControlsDisabled}
							title={changeDisabledReason}
							onClick={() => handleMemoStatusClick("isReading")}
						>
							<BookOpenIcon
								size={16}
								className={cn({ "text-emerald-500": memoData?.isReading })}
							/>
						</MemoStatusToggle>
						{!isMemoLocked && (
							<SaveStatus
								saveStatus={displaySaveStatus}
								onRetryClick={handleSaveRetryClick}
								onSyncRetryClick={onRetrySync}
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
								disabledReason={changeDisabledReason}
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
								disabledReason={changeDisabledReason}
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
	isMemoLocked,
	isMemoLoadFailed,
	onMemoRetryClick,
	isSyncing,
	isSyncFailed,
	hasSyncNetworkError,
	onRetrySync,
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
				isMemoLocked={isMemoLocked}
				isMemoLoadFailed={isMemoLoadFailed}
				onMemoRetryClick={onMemoRetryClick}
				isSyncing={isSyncing}
				isSyncFailed={isSyncFailed}
				hasSyncNetworkError={hasSyncNetworkError}
				onRetrySync={onRetrySync}
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
	/** 메모 후보 조회가 대기 중이거나 데이터 없이 실패해 편집·저장을 막아야 하는지 */
	isMemoLocked?: boolean;
	/** 재조회 중이 아니면서 메모 후보 조회가 데이터 없이 실패했는지. 실패 문구와 다시 시도 버튼을 보여 준다 */
	isMemoLoadFailed?: boolean;
	/** 실패 문구 옆 다시 시도 버튼을 눌렀을 때 메모 후보를 다시 조회한다 */
	onMemoRetryClick?: () => void | Promise<void>;
	/** 오프라인 대기열을 서버로 올리는 중인지. 카테고리·상태 토글을 막는다 */
	isSyncing?: boolean;
	/** 마지막 flush가 네트워크 오류가 아닌 이유로 실패했는지. 다시 시도 버튼을 보여준다 */
	isSyncFailed?: boolean;
	/** 마지막 flush 시도가 네트워크 오류로 중단됐는지. 저장 표시줄이 오프라인 표시와 함께 쓴다 */
	hasSyncNetworkError?: boolean;
	/** 대기열 동기화 실패(syncFailed) 다시 시도 버튼 클릭 핸들러 */
	onRetrySync?: () => void;
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
	/** 막힌 사유(오프라인·동기화 중). 잠금(isDisabled)이 함께 걸리면 비워 둔다 */
	title?: string;
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
	title,
	onClick,
	children,
}: IFMemoStatusToggleProps) {
	return (
		<button
			type="button"
			aria-label={label}
			aria-pressed={isOn}
			disabled={isDisabled}
			title={title}
			onClick={onClick}
			className={cn(
				"focus-visible:ring-ring rounded-sm transition-transform focus-visible:outline-none focus-visible:ring-1",
				// 사유(title)가 있는 비활성은 오프라인·동기화 중이라 누를 수 없음을 커서로도 알린다
				isDisabled && (title ? "cursor-not-allowed" : "cursor-default"),
				!isDisabled && "hover:scale-110 active:scale-95",
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
