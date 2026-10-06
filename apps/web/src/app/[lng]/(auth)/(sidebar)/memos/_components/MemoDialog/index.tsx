"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { useQuery } from "@tanstack/react-query";
import {
	memoQueryOptions,
	useSettingQuery,
	useSupabaseClientQuery,
} from "@web-memo/shared/hooks";
import { useSearchParams } from "@web-memo/shared/modules/search-params";
import type { GetMemoResponse } from "@web-memo/shared/types";
import { adjustTextareaHeight } from "@web-memo/shared/utils";
import {
	Card,
	CardContent,
	Dialog,
	DialogContent,
	DialogTitle,
	Loading,
	Textarea,
} from "@web-memo/ui";
import { motion } from "framer-motion";
import { useLayoutEffect, useRef } from "react";
import { useWatch } from "react-hook-form";
import MemoCardFooter from "../MemoCardFooter";
import MemoCardHeader from "../MemoCardHeader";
import { MemoDialogHighlights } from "./MemoDialogHighlights";
import SaveStatusIndicator from "./SaveStatusIndicator";
import { useMemoDialogEditor } from "./useMemoDialogEditor";

/** 카드 값으로 즉시 열고 상세 쿼리는 백그라운드에서 동기화한다. */
export default function MemoDialog({
	lng,
	memoId,
	initialMemo,
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
			onClose={closeDialog}
		/>
	);
}

function MemoDialogContent({ lng, memo, latestMemo, onClose }: ContentProps) {
	const { t } = useTranslation(lng);
	const { showImpression, showActionItem } = useSettingQuery();
	const { form, saveStatus, markEdited, changeTitle, flushDebounce } =
		useMemoDialogEditor({ memo, latestMemo });
	const { register, watch } = form;
	useWatch({
		control: form.control,
		name: ["memo", "impression", "actionItem"],
	});
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

	useLayoutEffect(() => {
		for (const textarea of [
			memoRef.current,
			impressionRef.current,
			actionItemRef.current,
		]) {
			if (textarea) adjustTextareaHeight(textarea);
		}
	});

	function closeAndSave() {
		flushDebounce();
		onClose();
	}

	return (
		<Dialog open>
			<DialogContent
				className="max-h-[90dvh] max-w-[600px] overflow-y-auto p-0"
				onClose={closeAndSave}
				aria-describedby={undefined}
			>
				<DialogTitle className="sr-only">{title}</DialogTitle>
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
				>
					<Card>
						<MemoCardHeader
							memo={{ ...memo, title }}
							onTitleChange={changeTitle}
							className="pr-12"
						/>
						<CardContent className="space-y-4 px-5 py-4">
							<Textarea
								{...memoField}
								ref={(element) => {
									memoField.ref(element);
									memoRef.current = element;
								}}
								layout={false}
								className="resize-none overflow-hidden outline-none focus:border-border focus:outline-none !transition-[border-color,box-shadow]"
								placeholder={t("memos.placeholder")}
								data-testid="memo-textarea"
							/>
							{showImpression && (
								<div className="space-y-1.5">
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
										className="resize-none overflow-hidden outline-none focus:border-border focus:outline-none !transition-[border-color,box-shadow]"
										placeholder={t("memoSection.impressionPlaceholder")}
										data-testid="impression-textarea"
									/>
								</div>
							)}
							{showActionItem && (
								<div className="space-y-1.5">
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
										className="resize-none overflow-hidden outline-none focus:border-border focus:outline-none !transition-[border-color,box-shadow]"
										placeholder={t("memoSection.actionItemPlaceholder")}
										data-testid="action-item-textarea"
									/>
								</div>
							)}
							<MemoDialogHighlights lng={lng} url={memo.url} />
							<div className="flex h-4 items-center">
								<SaveStatusIndicator status={saveStatus} lng={lng} />
							</div>
						</CardContent>
						<MemoCardFooter
							memo={memo}
							lng={lng}
							isShowingOption={false}
							className="px-6 py-4 border-t-0"
						/>
					</Card>
				</motion.div>
			</DialogContent>
		</Dialog>
	);
}

interface MemoDialogProps extends LanguageType {
	memoId: number;
	initialMemo?: GetMemoResponse;
}
interface ContentProps extends LanguageType {
	memo: GetMemoResponse;
	latestMemo?: GetMemoResponse;
	onClose: () => void;
}
