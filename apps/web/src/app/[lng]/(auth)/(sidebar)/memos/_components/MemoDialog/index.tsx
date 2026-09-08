"use client";

import type { MemoInput } from "@src/app/[lng]/(auth)/(sidebar)/memos/_types/Input";
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
import {
	useCallback,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from "react";
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
	const { showImpression, showActionItem } = useSettingQuery();
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
			title: "",
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

	// 제목은 헤더에서 곧바로 반영되고, 본문처럼 계속 타이핑하는 필드가 아니다.
	// 제목만 바꿔도 하단에 "저장 중"이 떴다 사라지는 것이 산만해서 저장 표시에서 뺀다.
	// 저장 자체는 같은 경로로 나가고, 표시 여부만 이 값으로 가른다.
	const hasPendingMemoFieldEditRef = useRef(false);

	const saveMemo = useCallback(() => {
		const shouldIndicateSaveStatus = hasPendingMemoFieldEditRef.current;
		const currentTitle = watch("title");
		const currentMemo = watch("memo");
		const currentImpression = watch("impression");
		const currentActionItem = watch("actionItem");

		const isEdited =
			currentTitle !== memoData?.title ||
			currentMemo !== memoData?.memo ||
			currentImpression !== (memoData?.impression ?? "") ||
			currentActionItem !== (memoData?.actionItem ?? "");

		if (!isEdited) {
			if (shouldIndicateSaveStatus) {
				setSaveStatus("idle");
			}

			return;
		}

		if (shouldIndicateSaveStatus) {
			setSaveStatus("saving");
		}

		mutateMemoPatch(
			{
				id: memoId,
				request: {
					title: currentTitle,
					memo: currentMemo,
					impression: currentImpression,
					actionItem: currentActionItem,
				},
			},
			{
				onSuccess: () => {
					hasPendingMemoFieldEditRef.current = false;

					if (shouldIndicateSaveStatus) {
						setSaveStatus("saved");
					}
				},
				onError: () => {
					if (shouldIndicateSaveStatus) {
						setSaveStatus("error");
					}
				},
			},
		);
	}, [
		watch,
		memoData?.title,
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

	// 저장이 끝나면 useMemoPatchMutation이 memo 쿼리를 무효화해 memoData가 새로 온다.
	// 그때 폼을 다시 채우면 그 사이에 사용자가 친 글자가 서버 값으로 덮여 사라진다.
	// 그래서 폼 초기화는 다루는 메모가 바뀔 때 한 번만 한다.
	const initializedMemoIdRef = useRef<number | null>(null);

	useEffect(
		function initMemoData() {
			if (!memoData) return;
			if (initializedMemoIdRef.current === memoData.id) return;

			initializedMemoIdRef.current = memoData.id;
			setValue("title", memoData.title);
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
			const subscription = watch((value, { name }) => {
				if (
					!value.title &&
					!value.memo &&
					!value.impression &&
					!value.actionItem
				) {
					return;
				}

				if (name !== "title") {
					hasPendingMemoFieldEditRef.current = true;
					setSaveStatus("saving");
				}

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
						{/* 닫기 버튼(right-4)이 제목 위로 겹친다. 그만큼 오른쪽을 비운다. */}
						<MemoCardHeader
							memo={memoData}
							onTitleChange={(title) =>
								setValue("title", title, { shouldDirty: true })
							}
							className="pr-12"
						/>
						{/* CardContent 의 기본값은 px-6 뿐이라 세로 여백이 아예 없다.
						    헤더·푸터가 px-5 를 쓰므로 가로도 거기에 맞춘다. */}
						<CardContent className="space-y-4 px-5 py-4">
							<Textarea
								{...memoRest}
								className="resize-none overflow-hidden outline-none focus:border-border focus:outline-none"
								ref={memoTextareaRef}
								placeholder={t("memos.placeholder")}
								data-testid="memo-textarea"
							/>

							{showImpression && (
								<div className="space-y-1.5">
									{/* label 은 inline 이라 세로 마진이 무시된다. block 이어야 간격이 생긴다. */}
									<label
										htmlFor="impression"
										className="block text-xs font-semibold text-muted-foreground"
									>
										{t("memoSection.impression")}
									</label>
									<Textarea
										{...impressionRest}
										id="impression"
										className="resize-none overflow-hidden outline-none focus:border-border focus:outline-none"
										ref={impressionTextareaRef}
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
										{...actionItemRest}
										id="actionItem"
										className="resize-none overflow-hidden outline-none focus:border-border focus:outline-none"
										ref={actionItemTextareaRef}
										placeholder={t("memoSection.actionItemPlaceholder")}
										data-testid="action-item-textarea"
									/>
								</div>
							)}

							<div className="flex h-4 items-center">
								<SaveStatusIndicator status={saveStatus} lng={lng} />
							</div>
						</CardContent>
						<MemoCardFooter
							memo={memoData}
							lng={lng}
							isShowingOption={false}
							className="py-4"
						/>
					</Card>
				</motion.div>
			</DialogContent>
		</Dialog>
	);
}
