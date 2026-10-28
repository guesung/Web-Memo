"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { useQuery } from "@tanstack/react-query";
import {
	memoQueryOptions,
	useHighlightMemoLinks,
	useSettingQuery,
	useSupabaseClientQuery,
} from "@web-memo/shared/hooks";
import { useSearchParams } from "@web-memo/shared/modules/search-params";
import type { GetMemoResponse } from "@web-memo/shared/types";
import { adjustTextareaHeight, cn } from "@web-memo/shared/utils";
import {
	Button,
	Dialog,
	DialogContent,
	DialogTitle,
	IconTooltip,
	Loading,
	Textarea,
} from "@web-memo/ui";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useWatch } from "react-hook-form";
import { isTypingTarget } from "../../_utils";
import MemoCardFooter from "../MemoCardFooter";
import CategoryPopover from "../MemoCardFooter/CategoryPopover";
import useMemoCategoryPopover from "../MemoCardFooter/useMemoCategoryPopover";
import MemoCardHeader from "../MemoCardHeader";
import { MemoSourceQuote } from "../MemoView/MemoSourceQuote";
import { MemoDialogHighlights } from "./MemoDialogHighlights";
import SaveStatusIndicator from "./SaveStatusIndicator";
import { useMemoDialogEditor } from "./useMemoDialogEditor";
import { useMemoHashCategory } from "./useMemoHashCategory";

/** 카드 값으로 즉시 열고 상세 쿼리는 백그라운드에서 동기화한다. */
export default function MemoDialog({
	lng,
	memoId,
	initialMemo,
	prevMemoId,
	nextMemoId,
}: MemoDialogProps) {
	const { t } = useTranslation(lng);
	const { data: supabaseClient } = useSupabaseClientQuery();
	const query = useQuery(memoQueryOptions({ supabaseClient, id: memoId }));
	const latestMemo = query.data?.data?.find((memo) => memo.id === memoId);
	const memo = initialMemo?.id === memoId ? initialMemo : latestMemo;
	const searchParams = useSearchParams();

	function closeDialog() {
		if (history.state?.openedMemoId === memoId) history.back();
		else {
			searchParams.removeAll("id");
			history.pushState({}, "", searchParams.getUrl());
		}
	}

	/** 기록을 쌓지 않고 id만 바꿔, 닫으면 몇 개를 넘겼든 바로 목록으로 돌아간다. */
	function navigateDialog(nextId: number) {
		searchParams.set("id", String(nextId));
		const isOpenedFromList = history.state?.openedMemoId !== undefined;
		history.replaceState(
			isOpenedFromList ? { openedMemoId: nextId } : {},
			"",
			searchParams.getUrl(),
		);
	}

	if (!memo) {
		return (
			<Dialog open>
				<DialogContent
					className="max-w-[600px]"
					onClose={closeDialog}
					aria-describedby={undefined}
				>
					<DialogTitle className="sr-only">{t("sideBar.memo")}</DialogTitle>
					{query.isError || query.isSuccess ? (
						<div role="alert" className="flex items-center gap-2">
							<p>{t(query.isError ? "error.500.title" : "error.404.title")}</p>
							{query.isError && (
								<button
									type="button"
									onClick={() => void query.refetch()}
									className="underline"
								>
									{t("error.500.retry")}
								</button>
							)}
						</div>
					) : (
						<Loading aria-label={t("sideBar.memo")} />
					)}
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<MemoDialogContent
			key={memo.id}
			lng={lng}
			memo={memo}
			latestMemo={latestMemo}
			prevMemoId={prevMemoId}
			nextMemoId={nextMemoId}
			onClose={closeDialog}
			onNavigate={navigateDialog}
		/>
	);
}

function MemoDialogContent({
	lng,
	memo,
	latestMemo,
	prevMemoId,
	nextMemoId,
	onClose,
	onNavigate,
}: ContentProps) {
	const { t } = useTranslation(lng);
	const { showImpression, showActionItem } = useSettingQuery();
	const sources = useHighlightMemoLinks([memo.id], "memo");
	const source = sources.data?.[0];
	const {
		form,
		saveStatus,
		markEdited,
		changeTitle,
		flushDebounce,
		abortDebounce,
	} = useMemoDialogEditor({ memo, latestMemo });
	const { register, watch } = form;
	// 본문 #과 푸터(배지·⋮)가 같은 팝업을 열도록 모달이 갖는다.
	const categoryPopover = useMemoCategoryPopover({ lng, memo });
	const hashCategory = useMemoHashCategory({
		form,
		markEdited,
		categoryPopover,
	});
	const [, impression, actionItem] = useWatch({
		control: form.control,
		name: ["memo", "impression", "actionItem"],
	});
	// 비어 있는 보조 필드는 + 버튼으로 접어 둔다. 한 번 펼친 필드는 내용을 지워도 닫지 않는다.
	const [openedFields, setOpenedFields] = useState(
		() =>
			new Set<TSubField>(
				SUB_FIELDS.filter((field) => Boolean(form.getValues(field))),
			),
	);
	const [focusField, setFocusField] = useState<TSubField | null>(null);
	const memoRef = useRef<HTMLTextAreaElement | null>(null);
	const impressionRef = useRef<HTMLTextAreaElement | null>(null);
	const actionItemRef = useRef<HTMLTextAreaElement | null>(null);
	const title = watch("title");
	const memoField = register("memo", { onChange: () => markEdited("memo") });
	const impressionField = register("impression", {
		onChange: () => markEdited("impression"),
	});
	const actionItemField = register("actionItem", {
		onChange: () => markEdited("actionItem"),
	});
	const isImpressionVisible =
		showImpression && (openedFields.has("impression") || Boolean(impression));
	const isActionItemVisible =
		showActionItem && (openedFields.has("actionItem") || Boolean(actionItem));

	useLayoutEffect(() => {
		for (const textarea of [
			memoRef.current,
			impressionRef.current,
			actionItemRef.current,
		]) {
			if (textarea) adjustTextareaHeight(textarea);
		}
	});

	useLayoutEffect(
		function focusOpenedField() {
			if (!focusField) return;
			const refs = { impression: impressionRef, actionItem: actionItemRef };
			refs[focusField].current?.focus();
			setFocusField(null);
		},
		[focusField],
	);

	function openField(field: TSubField) {
		setOpenedFields((prev) => new Set(prev).add(field));
		setFocusField(field);
	}

	function closeAndSave() {
		flushDebounce();
		onClose();
	}

	function closeAfterDelete() {
		abortDebounce();
		onClose();
	}

	function navigateTo(memoId?: number) {
		if (memoId === undefined) return;
		flushDebounce();
		onNavigate(memoId);
	}

	useEffect(function navigateWithArrowKeys() {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.defaultPrevented || event.isComposing) return;
			if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
				return;
			if (isTypingTarget(event.target)) return;
			if (event.key === "ArrowLeft") navigateTo(prevMemoId);
			if (event.key === "ArrowRight") navigateTo(nextMemoId);
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	});

	return (
		<Dialog open>
			<DialogContent
				className="max-h-[90dvh] max-w-[720px] gap-0 overflow-y-auto bg-card p-0 sm:rounded-xl"
				onClose={closeAndSave}
				aria-describedby={undefined}
			>
				<DialogTitle className="sr-only">{title}</DialogTitle>
				<MemoCardHeader
					memo={{ ...memo, title }}
					onTitleChange={changeTitle}
					showsSourceDomain
					className="border-b-0 px-6 pb-1 pt-5 pr-32"
				/>
				<div className="space-y-5 px-6 py-3">
					{source && <MemoSourceQuote lng={lng} source={source} />}
					{sources.isError && (
						<div
							role="alert"
							className="flex items-center gap-2 text-xs text-destructive"
						>
							<span>{t("highlight.memo.loadError")}</span>
							<button
								type="button"
								onClick={() => void sources.refetch()}
								className="underline"
							>
								{t("error.500.retry")}
							</button>
						</div>
					)}
					<Textarea
						{...memoField}
						ref={(element) => {
							memoField.ref(element);
							memoRef.current = element;
						}}
						onKeyDown={hashCategory.handleKeyDown}
						layout={false}
						className={cn(INLINE_TEXTAREA_CLASSNAME, "text-base leading-7")}
						placeholder={t("memos.placeholder")}
						data-testid="memo-textarea"
					/>
					{isImpressionVisible && (
						<div className="space-y-1.5 border-t border-border pt-4">
							<label
								htmlFor="impression"
								className="block text-xs font-semibold text-muted-foreground"
							>
								{t("memoSection.impression")}
							</label>
							<Textarea
								{...impressionField}
								id="impression"
								ref={(element) => {
									impressionField.ref(element);
									impressionRef.current = element;
								}}
								layout={false}
								className={cn(INLINE_TEXTAREA_CLASSNAME, "leading-6")}
								placeholder={t("memoSection.impressionPlaceholder")}
								data-testid="impression-textarea"
							/>
						</div>
					)}
					{isActionItemVisible && (
						<div className="space-y-1.5 border-t border-border pt-4">
							<label
								htmlFor="actionItem"
								className="block text-xs font-semibold text-muted-foreground"
							>
								{t("memoSection.actionItem")}
							</label>
							<Textarea
								{...actionItemField}
								id="actionItem"
								ref={(element) => {
									actionItemField.ref(element);
									actionItemRef.current = element;
								}}
								layout={false}
								className={cn(INLINE_TEXTAREA_CLASSNAME, "leading-6")}
								placeholder={t("memoSection.actionItemPlaceholder")}
								data-testid="action-item-textarea"
							/>
						</div>
					)}
					{((showImpression && !isImpressionVisible) ||
						(showActionItem && !isActionItemVisible)) && (
						<div className="flex flex-wrap gap-2">
							{showImpression && !isImpressionVisible && (
								<AddFieldButton
									label={t("memoSection.addImpression")}
									onClick={() => openField("impression")}
									testId="add-impression-button"
								/>
							)}
							{showActionItem && !isActionItemVisible && (
								<AddFieldButton
									label={t("memoSection.addActionItem")}
									onClick={() => openField("actionItem")}
									testId="add-action-item-button"
								/>
							)}
						</div>
					)}
					<MemoDialogHighlights
						lng={lng}
						url={memo.url}
						omitHighlightId={source?.highlight_id}
					/>
				</div>
				<MemoCardFooter
					memo={memo}
					lng={lng}
					categoryBadgeAction="popup"
					categoryPopover={categoryPopover}
					showsAbsoluteTime
					labelsActiveToggles
					onDeleteSuccess={closeAfterDelete}
					timeAccessory={
						<SaveStatusIndicator status={saveStatus} lng={lng} showsLabel />
					}
					className="px-6 py-3"
				/>
				<CategoryPopover lng={lng} popover={categoryPopover} />
				{/* 위치는 헤더 옆이지만, 탭 순서는 본문과 푸터 다음에 둔다. */}
				<div className="absolute right-12 top-3 z-10 flex items-center text-muted-foreground">
					<IconTooltip label={t("memos.dialog.prev")}>
						<Button
							variant="ghost"
							size="icon"
							className="size-8"
							aria-label={t("memos.dialog.prev")}
							disabled={prevMemoId === undefined}
							onClick={() => navigateTo(prevMemoId)}
							data-testid="memo-dialog-prev"
						>
							<ChevronLeft className="size-4" />
						</Button>
					</IconTooltip>
					<IconTooltip label={t("memos.dialog.next")}>
						<Button
							variant="ghost"
							size="icon"
							className="size-8"
							aria-label={t("memos.dialog.next")}
							disabled={nextMemoId === undefined}
							onClick={() => navigateTo(nextMemoId)}
							data-testid="memo-dialog-next"
						>
							<ChevronRight className="size-4" />
						</Button>
					</IconTooltip>
				</div>
			</DialogContent>
		</Dialog>
	);
}

/** 비어 있어 접어 둔 보조 필드를 펼치는 버튼. */
function AddFieldButton({
	label,
	onClick,
	testId,
}: {
	label: string;
	onClick: () => void;
	testId: string;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-input hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
			data-testid={testId}
		>
			<Plus className="size-3.5" aria-hidden="true" />
			{label}
		</button>
	);
}

/**
 * 평소엔 글처럼 보이고, 호버하면 옅은 배경, 편집하면 입력 테두리를 드러내는 textarea.
 * @description 가장자리 여백만큼 음수 마진을 줘 글이 헤더 제목과 같은 선에서 시작한다.
 */
const INLINE_TEXTAREA_CLASSNAME =
	"-mx-3 w-[calc(100%+1.5rem)] resize-none overflow-hidden border-transparent shadow-none outline-none hover:bg-accent/60 focus:bg-background focus:border-input focus-visible:ring-ring !transition-[border-color,box-shadow,background-color]";

const SUB_FIELDS = ["impression", "actionItem"] as const;
type TSubField = (typeof SUB_FIELDS)[number];

interface MemoDialogProps extends LanguageType {
	memoId: number;
	initialMemo?: GetMemoResponse;
	/** 목록에서 앞뒤 메모 id. 없으면 그 방향 이동 버튼을 끈다 */
	prevMemoId?: number;
	nextMemoId?: number;
}
interface ContentProps extends LanguageType {
	memo: GetMemoResponse;
	latestMemo?: GetMemoResponse;
	prevMemoId?: number;
	nextMemoId?: number;
	onClose: () => void;
	onNavigate: (memoId: number) => void;
}
