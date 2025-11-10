"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { useMemoByIDQuery } from "@web-memo/shared/hooks";
import {
	Card,
	CardContent,
	Dialog,
	DialogContent,
	Textarea,
} from "@web-memo/ui";
import { motion } from "framer-motion";
import { useRef } from "react";

import MemoCardFooter from "../MemoCardFooter";
import MemoCardHeader from "../MemoCardHeader";
import { useAutoResizeTextarea } from "./hooks/useAutoResizeTextarea";
import { useMemoDialog } from "./hooks/useMemoDialog";
import { useMemoForm } from "./hooks/useMemoForm";
import UnsavedChangesAlert from "./UnsavedChangesAlert";

interface MemoDialog extends LanguageType {
	memoId: number;
}

export default function MemoDialog({ lng, memoId }: MemoDialog) {
	const { t } = useTranslation(lng);
	const { data } = useMemoByIDQuery({ id: memoId });
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const memoData = data?.data;

	const { formRegister, formRef, saveMemo, checkIfEdited } = useMemoForm({
		memoId,
		memoData,
		textareaRef,
	});

	const {
		showAlert,
		closeDialog,
		checkEditedAndCloseDialog,
		handleCancelAlert,
	} = useMemoDialog({ memoId, checkIfEdited, saveMemo });

	useAutoResizeTextarea(textareaRef);

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
									{...formRegister}
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
				onCancel={handleCancelAlert}
				onOk={closeDialog}
				lng={lng}
			/>
		</>
	);
}
