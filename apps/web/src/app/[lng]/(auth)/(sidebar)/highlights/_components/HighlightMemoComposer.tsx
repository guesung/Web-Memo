"use client";

import type { Language } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { PATHS } from "@web-memo/shared/constants";
import { useCreateHighlightMemo } from "@web-memo/shared/hooks";
import { analytics } from "@web-memo/shared/modules/analytics";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";

interface HighlightMemoComposerProps {
	lng: Language;
	highlightId: number;
	quote: string;
	draft: string;
	onDraftChange: (draft: string) => void;
	onCancel: () => void;
}

/** 인용은 읽기 전용으로 보여주고 생각만 명시적으로 저장한다. */
export function HighlightMemoComposer({
	lng,
	highlightId,
	quote,
	draft,
	onDraftChange,
	onCancel,
}: HighlightMemoComposerProps) {
	const { t } = useTranslation(lng);
	const router = useRouter();
	const createMemo = useCreateHighlightMemo();
	const [hasError, setHasError] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	useEffect(() => textareaRef.current?.focus(), []);

	async function handleSave(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!draft.trim() || createMemo.isPending) return;
		setHasError(false);
		try {
			const result = await createMemo.mutateAsync({
				highlightId,
				memo: draft.trim(),
			});
			if (!result.deleted_at)
				analytics.trackEvent({
					name: "memo_open",
					params: { source: "highlight", has_search_query: false },
				});
			router.push(
				result.deleted_at
					? `/${lng}${PATHS.memosTrash}`
					: `/${lng}${PATHS.memos}?id=${result.memo_id}`,
			);
		} catch {
			setHasError(true);
		}
	}

	return (
		<form
			onSubmit={handleSave}
			className="mt-3 space-y-2 rounded-lg border border-border bg-background p-3"
		>
			<p className="text-xs font-semibold text-muted-foreground">
				{t("highlight.memo.quote")}
			</p>
			<blockquote className="rounded border-l-2 border-highlight-yellow bg-highlight-yellow px-2 py-1 text-sm text-highlight-yellow-foreground">
				{quote}
			</blockquote>
			<label className="sr-only" htmlFor={`highlight-memo-${highlightId}`}>
				{t("highlight.memo.placeholder")}
			</label>
			<textarea
				ref={textareaRef}
				id={`highlight-memo-${highlightId}`}
				rows={3}
				value={draft}
				onChange={(event) => onDraftChange(event.target.value)}
				placeholder={t("highlight.memo.placeholder")}
				className="w-full resize-y rounded-md border border-border bg-background p-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			/>
			{hasError && (
				<p role="alert" className="text-xs text-destructive">
					{t("highlight.memo.saveError")}
				</p>
			)}
			<div className="flex justify-between gap-2">
				<button
					type="button"
					onClick={onCancel}
					disabled={createMemo.isPending}
					className="rounded-md border border-border px-2 py-1 text-xs"
				>
					{t("highlight.memo.cancel")}
				</button>
				<button
					type="submit"
					disabled={!draft.trim() || createMemo.isPending}
					className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
				>
					{t(
						createMemo.isPending
							? "highlight.memo.saving"
							: "highlight.memo.save",
					)}
				</button>
			</div>
		</form>
	);
}
