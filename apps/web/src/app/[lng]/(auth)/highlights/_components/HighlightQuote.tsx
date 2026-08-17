"use client";

import type { Language } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import {
	HIGHLIGHT_COLOR_STYLE,
	type HighlightColor,
} from "@web-memo/shared/constants";
import type { HighlightRow } from "@web-memo/shared/types";
import { useEffect, useRef, useState } from "react";
import { useHighlightNoteMutation } from "../_hooks";

interface HighlightQuoteProps {
	highlight: HighlightRow;
	lng: Language;
}

/** URL별 그룹 카드 안에서 하이라이트 한 문장을 보여준다. 코멘트 영역을 누르면 편집할 수 있다. */
export function HighlightQuote({ highlight, lng }: HighlightQuoteProps) {
	const { t } = useTranslation(lng);
	const [isEditing, setIsEditing] = useState(false);
	const [note, setNote] = useState(highlight.note ?? "");
	const { mutate: saveNote } = useHighlightNoteMutation();
	const noteTextareaRef = useRef<HTMLTextAreaElement>(null);

	const style = HIGHLIGHT_COLOR_STYLE[highlight.color as HighlightColor];

	useEffect(() => {
		if (isEditing) {
			noteTextareaRef.current?.focus();
		}
	}, [isEditing]);

	const handleNoteBlur = () => {
		setIsEditing(false);

		if (note === (highlight.note ?? "")) {
			return;
		}

		saveNote({ id: highlight.id, note });
	};

	return (
		<li className="flex gap-3 py-2">
			<span
				aria-hidden
				className="w-1 shrink-0 rounded-full"
				style={{ backgroundColor: style.bar }}
			/>
			<div className="min-w-0 flex-1">
				<p className="text-sm leading-6 text-foreground">
					{highlight.exact_text}
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
				) : (
					<button
						type="button"
						onClick={() => setIsEditing(true)}
						className="mt-1 block text-left text-xs text-muted-foreground hover:underline"
					>
						{note || t("highlight.note.placeholder")}
					</button>
				)}
			</div>
		</li>
	);
}
