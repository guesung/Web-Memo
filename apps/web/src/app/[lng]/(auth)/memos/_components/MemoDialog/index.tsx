"use client";

import type { MemoInput } from "@src/app/[lng]/(auth)/memos/_types/Input";
import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import {
	useDebounce,
	useKeyboardBind,
	useMemoPatchMutation,
	useMemoQuery,
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
import UnsavedChangesAlert from "./UnsavedChangesAlert";

interface MemoDialog extends LanguageType {
	memoId: number;
}

export default function MemoDialog({ lng, memoId }: MemoDialog) {
	const { t } = useTranslation(lng);
	const { memo: memoData } = useMemoQuery({ id: memoId });
	const { textareaRef, handleTextareaChange } = useTextareaAutoResize();
	const { mutate: mutateMemoPatch } = useMemoPatchMutation();
	const [showAlert, setShowAlert] = useState(false);
	const searchParams = useSearchParams();
	const { debounce } = useDebounce();

	const { register, watch, setValue } = useForm<MemoInput>({
		defaultValues: {
			memo: "",
		},
	});

	const { ref, ...rest } = register("memo", {
		onChange: (event) => {
			handleTextareaChange(event);
		},
	});
	useImperativeHandle(ref, () => textareaRef.current);

	const saveMemo = useCallback(() => {
		const currentMemo = watch("memo");
		const isEdited = currentMemo !== memoData?.memo;

		if (isEdited && currentMemo.trim() !== "") {
			mutateMemoPatch({
				id: memoId,
				request: {
					memo: currentMemo,
				},
			});
		}
	}, [watch, memoData?.memo, mutateMemoPatch, memoId]);

	useKeyboardBind({ key: "s", callback: saveMemo, isMetaKey: true });

	const checkEditedAndCloseDialog = () => {
		const isEdited = watch("memo") !== memoData?.memo;

		if (isEdited) setShowAlert(true);
		else closeDialog();
	};

	const closeDialog = () => {
		const isHasPreviousPage = history.state?.openedMemoId === memoId;
		if (isHasPreviousPage) history.back();
		else {
			searchParams.removeAll("id");
			history.pushState({}, "", searchParams.getUrl());
		}
	};

	const handleUnChangesAlertClose = () => {
		setShowAlert(false);
	};

	useEffect(
		function initMemoData() {
			if (memoData) {
				setValue("memo", memoData.memo);
				if (textareaRef.current) {
					adjustTextareaHeight(textareaRef.current);
				}
			}
		},
		[memoData, setValue, textareaRef.current],
	);

	useEffect(
		function saveMemoOnChange() {
			const subscription = watch((value) => {
				debounce(() => {
					if (!value.memo) return;

					saveMemo();
				}, 500);
			});

			return () => subscription.unsubscribe();
		},
		[watch, debounce, saveMemo],
	);

	if (!memoData) return null;

	return (
		<>
			<Dialog open>
				<DialogContent
					className="max-w-[600px] p-0"
					onClose={checkEditedAndCloseDialog}
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
									{...rest}
									className="outline-none focus:border-gray-300 focus:outline-none"
									ref={textareaRef}
									placeholder={t("memos.placeholder")}
									data-testid="memo-textarea"
								/>

								<div className="h-4" />
							</CardContent>
							<MemoCardFooter
								memo={memoData}
								lng={lng}
								isShowingOption={false}
							/>
						</Card>
					</motion.div>
				</DialogContent>
			</Dialog>

			<UnsavedChangesAlert
				open={showAlert}
				onCancel={handleUnChangesAlertClose}
				onOk={closeDialog}
				lng={lng}
			/>
		</>
	);
}
