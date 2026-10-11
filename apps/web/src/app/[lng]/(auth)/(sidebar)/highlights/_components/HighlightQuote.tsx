"use client";

import type { Language } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import {
	HIGHLIGHT_COLOR_STYLE,
	type HighlightColor,
	PATHS,
} from "@web-memo/shared/constants";
import { analytics } from "@web-memo/shared/modules/analytics";
import type { HighlightMemoLink, HighlightRow } from "@web-memo/shared/types";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useHighlightNoteMutation } from "../_hooks";

/** 하이라이트 문장과 기존 메모를 표시하는 속성. */
interface IFHighlightQuoteProps {
	highlight: HighlightRow;
	lng: Language;
	link?: HighlightMemoLink;
	isLinkLoading?: boolean;
	isLinkError?: boolean;
	onRetryLinks?: () => void;
	isTarget?: boolean;
}

/** URL별 읽기 목록에서 하이라이트 한 문장을 보여준다. 코멘트 영역을 누르면 편집할 수 있다. */
export const HighlightQuote = ({
	highlight,
	lng,
	link,
	isLinkLoading,
	isLinkError,
	onRetryLinks,
	isTarget,
}: IFHighlightQuoteProps) => {
	const { t } = useTranslation(lng);
	const [isEditing, setIsEditing] = useState(false);
	const [note, setNote] = useState(highlight.note ?? "");
	const [savedNote, setSavedNote] = useState(highlight.note ?? "");
	const [isNoteSaveError, setIsNoteSaveError] = useState(false);
	const { mutate: saveNote, isPending: isNoteSaving } =
		useHighlightNoteMutation();
	const noteTextareaRef = useRef<HTMLTextAreaElement>(null);
	const itemRef = useRef<HTMLLIElement>(null);
	const style = HIGHLIGHT_COLOR_STYLE[highlight.color as HighlightColor];

	useEffect(() => {
		if (isEditing) {
			noteTextareaRef.current?.focus();
		}
	}, [isEditing]);

	useEffect(() => {
		if (!isTarget) return;
		itemRef.current?.scrollIntoView?.({ block: "center", behavior: "smooth" });
		itemRef.current?.focus({ preventScroll: true });
	}, [isTarget]);

	const handleNoteBlur = () => {
		setIsEditing(false);

		if (note === savedNote) {
			return;
		}

		setIsNoteSaveError(false);
		saveNote(
			{ id: highlight.id, note },
			{
				onSuccess: () => setSavedNote(note),
				onError: () => {
					setNote(savedNote);
					setIsNoteSaveError(true);
				},
			},
		);
	};

	return (
		<li
			ref={itemRef}
			id={`highlight-${highlight.id}`}
			tabIndex={isTarget ? -1 : undefined}
			className={`border-l-[3px] pl-[14px] outline-none sm:pl-4${isTarget ? " rounded-sm ring-2 ring-primary ring-offset-4 ring-offset-background" : ""}`}
			style={{ borderColor: style.bar }}
		>
			<div className="min-w-0">
				<p className="break-keep text-base leading-[1.6] text-foreground [overflow-wrap:anywhere]">
					<mark className="bg-transparent text-inherit">
						{highlight.exact_text}
					</mark>
				</p>

				{isEditing ? (
					<textarea
						ref={noteTextareaRef}
						value={note}
						onChange={(event) => setNote(event.target.value)}
						onBlur={handleNoteBlur}
						aria-label={t("highlight.note.label")}
						className="mt-1.5 w-full resize-none rounded-md border border-border bg-background p-2 text-[13px] leading-[1.5]"
						rows={2}
					/>
				) : note.trim() ? (
					<button
						type="button"
						disabled={isNoteSaving}
						onClick={() => setIsEditing(true)}
						className="mt-1.5 block text-left text-[13px] leading-[1.5] text-muted-foreground hover:underline"
					>
						{note}
					</button>
				) : null}
				{isNoteSaveError && (
					<p role="alert" className="mt-2 text-xs text-destructive">
						{t("memos.saveStatus.error")}
					</p>
				)}
				{link?.memo && !link.memo.deleted_at && (
					<div className="mt-1.5 space-y-1 text-xs text-muted-foreground">
						<p className="font-medium">{t("highlight.memo.linked")}</p>
						<p className="line-clamp-3 whitespace-pre-wrap">{link.memo.memo}</p>
					</div>
				)}
				{(isLinkError || isLinkLoading || link?.memo) && (
					<div className="mt-1.5 flex flex-wrap items-center gap-2">
						{isLinkError ? (
							<button
								type="button"
								onClick={onRetryLinks}
								className="text-xs text-destructive underline"
							>
								{t("highlight.memo.loadError")}
							</button>
						) : isLinkLoading ? (
							<span className="text-xs text-muted-foreground">
								{t("highlight.memo.loading")}
							</span>
						) : link?.memo ? (
							<Link
								href={
									link.memo.deleted_at
										? `/${lng}${PATHS.memosTrash}`
										: `/${lng}${PATHS.memos}?id=${link.memo_id}`
								}
								onClick={() => {
									if (!link.memo?.deleted_at)
										analytics.trackEvent({
											name: "memo_open",
											params: { source: "highlight", has_search_query: false },
										});
								}}
								className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
							>
								{t(
									link.memo.deleted_at
										? "highlight.memo.viewTrash"
										: "highlight.memo.open",
								)}
							</Link>
						) : null}
					</div>
				)}
			</div>
		</li>
	);
};
