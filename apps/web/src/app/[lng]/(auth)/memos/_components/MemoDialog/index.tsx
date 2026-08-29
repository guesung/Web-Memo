"use client";

import type { MemoInput } from "@src/app/[lng]/(auth)/memos/_types/Input";
import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import {
	useDebounce,
	useKeyboardBind,
	useMemoPatchMutation,
	useMemoQuery,
	useSettingQuery,
	useTextareaAutoResize,
} from "@web-memo/shared/hooks";
import { useSearchParams } from "@web-memo/shared/modules/search-params";
import { adjustTextareaHeight } from "@web-memo/shared/utils";
import {
	Card,
	CardContent,
	Dialog,
	DialogContent,
	Textarea,
} from "@web-memo/ui";
import { motion } from "framer-motion";
import { useCallback, useEffect, useImperativeHandle, useState } from "react";
import { useForm } from "react-hook-form";
import MemoCardFooter from "../MemoCardFooter";
import MemoCardHeader from "../MemoCardHeader";
import type { TMemoSaveStatus } from "./SaveStatusIndicator";
import SaveStatusIndicator from "./SaveStatusIndicator";

interface MemoDialog extends LanguageType {
	memoId: number;
}

export default function MemoDialog({ lng, memoId }: MemoDialog) {
	const { t } = useTranslation(lng);
	const { memo: memoData } = useMemoQuery({ id: memoId });
	const {
		showImpression: showImpressionSetting,
		showActionItem: showActionItemSetting,
	} = useSettingQuery();
	const showImpression = showImpressionSetting || !!memoData?.impression;
	const showActionItem = showActionItemSetting || !!memoData?.actionItem;
	const {
		textareaRef: memoTextareaRef,
		handleTextareaChange: handleMemoChange,
	} = useTextareaAutoResize();
	const {
		textareaRef: impressionTextareaRef,
		handleTextareaChange: handleImpressionChange,
	} = useTextareaAutoResize();
	const {
		textareaRef: actionItemTextareaRef,
		handleTextareaChange: handleActionItemChange,
	} = useTextareaAutoResize();
	const { mutate: mutateMemoPatch } = useMemoPatchMutation();
	const [saveStatus, setSaveStatus] = useState<TMemoSaveStatus>("idle");
	const searchParams = useSearchParams();
	const { debounce, flushDebounce } = useDebounce();

	const { register, watch, setValue } = useForm<MemoInput>({
		defaultValues: {
			memo: "",
			impression: "",
			actionItem: "",
		},
	});

	const { ref: memoRef, ...memoRest } = register("memo", {
		onChange: (event) => {
			handleMemoChange(event);
		},
	});
	useImperativeHandle(memoRef, () => memoTextareaRef.current);

	const { ref: impressionRef, ...impressionRest } = register("impression", {
		onChange: (event) => {
			handleImpressionChange(event);
		},
	});
	useImperativeHandle(impressionRef, () => impressionTextareaRef.current);

	const { ref: actionItemRef, ...actionItemRest } = register("actionItem", {
		onChange: (event) => {
			handleActionItemChange(event);
		},
	});
	useImperativeHandle(actionItemRef, () => actionItemTextareaRef.current);

	const saveMemo = useCallback(() => {
		const currentMemo = watch("memo");
		const currentImpression = watch("impression");
		const currentActionItem = watch("actionItem");

		const isEdited =
			currentMemo !== memoData?.memo ||
			currentImpression !== (memoData?.impression ?? "") ||
			currentActionItem !== (memoData?.actionItem ?? "");

		if (!isEdited) {
			setSaveStatus("idle");
			return;
		}

		setSaveStatus("saving");
		mutateMemoPatch(
			{
				id: memoId,
				request: {
					memo: currentMemo,
					impression: currentImpression,
					actionItem: currentActionItem,
				},
			},
			{
				onSuccess: () => setSaveStatus("saved"),
				onError: () => setSaveStatus("error"),
			},
		);
	}, [
		watch,
		memoData?.memo,
		memoData?.impression,
		memoData?.actionItem,
		mutateMemoPatch,
		memoId,
	]);

	useKeyboardBind({ key: "s", callback: saveMemo, isMetaKey: true });

	const closeDialog = () => {
		const isHasPreviousPage = history.state?.openedMemoId === memoId;
		if (isHasPreviousPage) history.back();
		else {
			searchParams.removeAll("id");
			history.pushState({}, "", searchParams.getUrl());
		}
	};

	const handleDialogClose = () => {
		flushDebounce();
		closeDialog();
	};

	useEffect(
		function initMemoData() {
			if (!memoData) return;

			setValue("memo", memoData.memo);
			setValue("impression", memoData.impression ?? "");
			setValue("actionItem", memoData.actionItem ?? "");
		},
		[memoData, setValue],
	);

	// 값 주입과 높이 보정을 한 이펙트에 두고 ref.current를 의존성에 넣으면, textarea ref가
	// 뒤늦게 붙는 렌더에서 이펙트가 다시 돌아 사용자가 방금 친 글자를 서버 값으로 덮어쓴다.
	// 그러면 디바운스 저장도 "바뀐 게 없다"고 판단해 조용히 넘어간다.
	useEffect(function adjustTextareaHeights() {
		for (const textareaRef of [
			memoTextareaRef,
			impressionTextareaRef,
			actionItemTextareaRef,
		]) {
			if (textareaRef.current) {
				adjustTextareaHeight(textareaRef.current);
			}
		}
	});

	useEffect(
		function saveMemoOnChange() {
			const subscription = watch((value) => {
				if (!value.memo && !value.impression && !value.actionItem) return;

				setSaveStatus("saving");
				debounce(() => {
					saveMemo();
				}, 1_000);
			});

			return () => subscription.unsubscribe();
		},
		[watch, debounce, saveMemo],
	);

	if (!memoData) return null;

	return (
		<Dialog open>
			<DialogContent
				className="max-h-[90dvh] max-w-[600px] overflow-y-auto p-0"
				onClose={handleDialogClose}
			>
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
				>
					<Card>
						<MemoCardHeader memo={memoData} />
						<CardContent>
							<Textarea
								{...memoRest}
								className="resize-none overflow-hidden outline-none focus:border-gray-300 focus:outline-none"
								ref={memoTextareaRef}
								placeholder={t("memos.placeholder")}
								data-testid="memo-textarea"
							/>

							{showImpression && (
								<>
									<label
										htmlFor="impression"
										className="mt-3 text-xs font-semibold text-gray-500"
									>
										{t("memoSection.impression")}
									</label>
									<Textarea
										{...impressionRest}
										id="impression"
										className="resize-none overflow-hidden outline-none focus:border-gray-300 focus:outline-none"
										ref={impressionTextareaRef}
										placeholder={t("memoSection.impressionPlaceholder")}
										data-testid="impression-textarea"
									/>
								</>
							)}

							{showActionItem && (
								<>
									<label
										htmlFor="actionItem"
										className="mt-3 text-xs font-semibold text-gray-500"
									>
										{t("memoSection.actionItem")}
									</label>
									<Textarea
										{...actionItemRest}
										id="actionItem"
										className="resize-none overflow-hidden outline-none focus:border-gray-300 focus:outline-none"
										ref={actionItemTextareaRef}
										placeholder={t("memoSection.actionItemPlaceholder")}
										data-testid="action-item-textarea"
									/>
								</>
							)}

							<div className="mt-3 flex h-4 items-center">
								<SaveStatusIndicator status={saveStatus} lng={lng} />
							</div>
						</CardContent>
						<MemoCardFooter memo={memoData} lng={lng} isShowingOption={false} />
					</Card>
				</motion.div>
			</DialogContent>
		</Dialog>
	);
}
