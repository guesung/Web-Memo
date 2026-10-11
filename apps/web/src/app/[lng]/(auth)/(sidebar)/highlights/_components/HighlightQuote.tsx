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
import { getHighlightSourceUrl } from "@web-memo/shared/utils";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useHighlightNoteMutation } from "../_hooks";
import { HighlightMemoComposer } from "./HighlightMemoComposer";

/** 하이라이트 문장과 기존 메모를 표시하는 속성. */
interface IFHighlightQuoteProps {
	highlight: HighlightRow;
	lng: Language;
	link?: HighlightMemoLink;
	isLinkLoading?: boolean;
	isLinkError?: boolean;
	onRetryLinks?: () => void;
	isTarget?: boolean;
	draft?: string;
	onDraftChange?: (draft: string) => void;
}

/** URL별 그룹 카드 안에서 하이라이트 한 문장을 보여준다. 코멘트 영역을 누르면 편집할 수 있다. */
export const HighlightQuote = ({
	highlight,
	lng,
	link,
	isLinkLoading,
	isLinkError,
	onRetryLinks,
	isTarget,
	draft: controlledDraft,
	onDraftChange,
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
	const addButtonRef = useRef<HTMLButtonElement>(null);
	const [isComposerOpen, setComposerOpen] = useState(false);
	const [localDraft, setLocalDraft] = useState("");
	const draft = controlledDraft ?? localDraft;

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
			className={`flex gap-3 py-3 outline-none${isTarget ? " rounded-lg ring-2 ring-primary" : ""}`}
		>
			<div className="min-w-0 flex-1">
				<p className="text-sm leading-6 text-foreground">
					<mark
						className={`box-decoration-clone rounded-sm px-1 ${highlight.color === "yellow" ? "bg-highlight-yellow text-highlight-yellow-foreground" : "text-foreground"}`}
						style={
							highlight.color === "yellow"
								? undefined
								: { backgroundColor: style.background }
						}
					>
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
						className="mt-1 w-full resize-none rounded-md border border-border bg-background p-2 text-xs"
						rows={2}
					/>
				) : note.trim() ? (
					<button
						type="button"
						disabled={isNoteSaving}
						onClick={() => setIsEditing(true)}
						className="mt-1 block text-left text-xs text-muted-foreground hover:underline"
					>
						{note}
					</button>
				) : null}
				{isNoteSaveError && (
					<p role="alert" className="mt-1 text-xs text-destructive">
						{t("memos.saveStatus.error")}
					</p>
				)}
				{link?.memo && !link.memo.deleted_at && (
					<div className="mt-2 space-y-1 text-xs">
						<p className="font-semibold text-primary">
							{t("highlight.memo.linked")}
						</p>
						<p className="line-clamp-3 whitespace-pre-wrap text-foreground">
							{link.memo.memo}
						</p>
					</div>
				)}
				{link?.memo?.deleted_at && (
					<p className="mt-2 text-xs text-muted-foreground">
						{t("highlight.memo.trashed")}
					</p>
				)}
				<div className="mt-3 flex flex-wrap items-center gap-2">
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
							className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground"
						>
							{t(
								link.memo.deleted_at
									? "highlight.memo.restore"
									: "highlight.memo.open",
							)}
						</Link>
					) : (
						<button
							ref={addButtonRef}
							type="button"
							onClick={() => setComposerOpen(true)}
							className="rounded-md border border-border px-2 py-1 text-xs hover:bg-accent"
						>
							{t("highlight.memo.add")}
						</button>
					)}
					<a
						href={getHighlightSourceUrl(highlight)}
						target="_blank"
						rel="noopener noreferrer"
						className="ml-auto text-xs text-muted-foreground underline"
					>
						{t("highlight.memo.source")}
					</a>
				</div>
				{isComposerOpen && !link && !isLinkError && (
					<HighlightMemoComposer
						lng={lng}
						highlightId={highlight.id}
						quote={highlight.exact_text}
						draft={draft}
						onDraftChange={(value) => {
							setLocalDraft(value);
							onDraftChange?.(value);
						}}
						onCancel={() => {
							setComposerOpen(false);
							addButtonRef.current?.focus();
						}}
					/>
				)}
			</div>
		</li>
	);
};
