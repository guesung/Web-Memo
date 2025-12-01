"use client";

import type { MemoInput } from "@src/app/[lng]/(auth)/memos/_types/Input";
import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import {
	useDebounce,
	useKeyboardBind,
	useMemoPatchMutation,
	useMemoQuery,
} from "@web-memo/shared/hooks";
import { useSearchParams } from "@web-memo/shared/modules/search-params";
import {
	Card,
	CardContent,
	Dialog,
	DialogContent,
	MarkdownEditor,
	type MarkdownEditorRef,
} from "@web-memo/ui";
import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
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
	const editorRef = useRef<MarkdownEditorRef>(null);
	const { mutate: mutateMemoPatch } = useMemoPatchMutation();
	const [showAlert, setShowAlert] = useState(false);
	const searchParams = useSearchParams();
	const { debounce } = useDebounce();

	const { watch, setValue } = useForm<MemoInput>({
		defaultValues: {
			memo: "",
		},
	});

	const handleEditorChange = useCallback(
		(markdown: string) => {
			setValue("memo", markdown);
		},
		[setValue],
	);

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

	const handleSaveAndClose = () => {
		saveMemo();
		closeDialog();
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

	// memoData가 로드되면 에디터에 반영
	useEffect(() => {
		if (memoData?.memo) {
			setValue("memo", memoData.memo);
			if (editorRef.current) {
				const currentMarkdown = editorRef.current.getMarkdown();
				if (currentMarkdown !== memoData.memo) {
					editorRef.current.setMarkdown(memoData.memo);
				}
			}
		}
	}, [memoData?.memo, setValue]);

	useEffect(() => {
		const subscription = watch((value) => {
			if (value.memo !== undefined) {
				debounce(() => {
					saveMemo();
				}, 1000);
			}
		});

		return () => subscription.unsubscribe();
	}, [watch, debounce, saveMemo]);

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
								<MarkdownEditor
									ref={editorRef}
									defaultValue={memoData?.memo ?? ""}
									onChange={handleEditorChange}
									placeholder={t("memos.placeholder")}
									className="min-h-[200px]"
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
