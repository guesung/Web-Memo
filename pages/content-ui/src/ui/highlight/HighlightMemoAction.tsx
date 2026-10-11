import { CONFIG } from "@web-memo/env";
import { PATHS } from "@web-memo/shared/constants";
import { analytics } from "@web-memo/shared/modules/analytics";
import { bridge } from "@web-memo/shared/modules/extension-bridge";
import type { HighlightRow } from "@web-memo/shared/types";
import { I18n } from "@web-memo/shared/utils/extension";
import { BookOpen, Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { reportContentUiError } from "../../utils/reportError";

type LinkState =
	| { status: "loading" }
	| { status: "error"; reason: "unauthenticated" | "load_failed" }
	| { status: "unlinked" }
	| { status: "linked"; memoId: number; deletedAt: string | null };

interface HighlightMemoActionProps {
	row: HighlightRow;
	initialOpen?: boolean;
	drafts: Map<number, string>;
	onOpenChange?: (isOpen: boolean) => void;
}

const memoUrl = (memoId: number, deletedAt: string | null) => {
	const path = deletedAt ? PATHS.memosTrash : PATHS.memos;
	const url = new URL(path, CONFIG.webUrl);
	url.searchParams.set("id", String(memoId));
	return url.href;
};

/** 기존 코멘트와 독립된 실제 메모 연결 및 작성 흐름. */
export const HighlightMemoAction = ({
	row,
	initialOpen = false,
	drafts,
	onOpenChange,
}: HighlightMemoActionProps) => {
	const [link, setLink] = useState<LinkState>({ status: "loading" });
	const [isOpen, setIsOpen] = useState(initialOpen);
	const [draft, setDraft] = useState(() => drafts.get(row.id) ?? "");
	const [isSaving, setIsSaving] = useState(false);
	const [saveError, setSaveError] = useState("");
	const actionRef = useRef<HTMLButtonElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const savingRef = useRef(false);
	const requestIdRef = useRef(0);
	const highlightId = row.id;

	const loadLink = useCallback(async () => {
		const requestId = ++requestIdRef.current;
		setLink({ status: "loading" });
		try {
			const response = await bridge.request.GET_HIGHLIGHT_MEMO_LINKS({
				highlightIds: [highlightId],
			});
			if (requestId !== requestIdRef.current) return;
			if (!response?.success) {
				setLink({
					status: "error",
					reason: response?.reason ?? "load_failed",
				});
				return;
			}
			const found = response.links.find(
				(item) => item.highlight_id === highlightId,
			);
			setLink(
				found?.memo
					? {
							status: "linked",
							memoId: found.memo_id,
							deletedAt: found.memo.deleted_at,
						}
					: found
						? { status: "error", reason: "load_failed" }
						: { status: "unlinked" },
			);
		} catch (error) {
			if (requestId !== requestIdRef.current) return;
			reportContentUiError({
				error,
				feature: "highlight",
				operation: "load-memo-link",
				stage: "request",
			});
			setLink({ status: "error", reason: "load_failed" });
		}
	}, [highlightId]);

	useEffect(() => {
		setIsOpen(initialOpen);
		setDraft(drafts.get(row.id) ?? "");
		setSaveError("");
		void loadLink();
		return () => {
			requestIdRef.current += 1;
		};
	}, [row.id, initialOpen, drafts, loadLink]);

	useEffect(() => {
		if (isOpen && link.status === "unlinked") textareaRef.current?.focus();
	}, [isOpen, link.status]);

	const save = async () => {
		const memo = draft.trim();
		if (!memo || savingRef.current || link.status !== "unlinked") return;
		savingRef.current = true;
		setIsSaving(true);
		setSaveError("");
		try {
			const response = await bridge.request.CREATE_MEMO_FROM_HIGHLIGHT({
				highlightId: row.id,
				memo,
			});
			if (!response?.success) {
				setSaveError(
					response?.reason === "unauthenticated"
						? "highlight_login_required"
						: "highlight_memo_save_failed",
				);
				return;
			}
			drafts.delete(row.id);
			setLink({
				status: "linked",
				memoId: response.memoId,
				deletedAt: response.deletedAt,
			});
			setIsOpen(false);
			onOpenChange?.(false);
		} catch (error) {
			reportContentUiError({
				error,
				feature: "highlight",
				operation: "create-memo-link",
				stage: "request",
			});
			setSaveError("highlight_memo_save_failed");
		} finally {
			savingRef.current = false;
			setIsSaving(false);
		}
	};

	return (
		<div className="flex flex-col gap-2">
			{link.status === "loading" && (
				<output className="px-2 text-xs text-muted-foreground">
					{I18n.get("highlight_memo_loading")}
				</output>
			)}
			{link.status === "error" && (
				<div className="flex flex-col gap-1 px-2 text-xs text-destructive">
					<span>
						{I18n.get(
							link.reason === "unauthenticated"
								? "highlight_login_required"
								: "highlight_memo_load_failed",
						)}
					</span>
					<button
						type="button"
						onClick={() => void loadLink()}
						className="self-start underline"
					>
						{I18n.get("highlight_memo_retry")}
					</button>
				</div>
			)}
			{link.status === "linked" && (
				<a
					href={memoUrl(link.memoId, link.deletedAt)}
					target="_blank"
					rel="noopener noreferrer"
					onClick={() => {
						if (!link.deletedAt) {
							analytics.trackEvent({
								name: "memo_open",
								params: { source: "highlight", has_search_query: false },
							});
						}
					}}
					className="flex items-center gap-2 rounded px-2 py-1 hover:bg-accent"
				>
					<BookOpen size={16} aria-hidden="true" />
					{I18n.get(
						link.deletedAt ? "highlight_memo_restore" : "highlight_memo_open",
					)}
				</a>
			)}
			{link.status === "unlinked" && (
				<>
					<button
						ref={actionRef}
						type="button"
						aria-expanded={isOpen}
						onClick={() => {
							setIsOpen(!isOpen);
							onOpenChange?.(!isOpen);
						}}
						className="flex items-center gap-2 rounded px-2 py-1 hover:bg-accent"
					>
						<Plus size={16} aria-hidden="true" />
						{I18n.get("highlight_memo_add")}
					</button>
					{isOpen && (
						<form
							className="flex flex-col gap-2"
							onSubmit={(event) => {
								event.preventDefault();
								void save();
							}}
						>
							<div className="rounded border-l-[3px] border-yellow-500 bg-highlight-yellow p-2 text-highlight-yellow-foreground">
								<span className="sr-only">
									{I18n.get("highlight_memo_quote")}
								</span>
								{row.exact_text}
							</div>
							<textarea
								ref={textareaRef}
								aria-label={I18n.get("highlight_memo_thought")}
								placeholder={I18n.get("highlight_memo_placeholder")}
								value={draft}
								disabled={isSaving}
								onChange={(event) => {
									setDraft(event.target.value);
									drafts.set(row.id, event.target.value);
								}}
								className="min-h-20 w-full resize-y rounded border bg-background p-2 text-sm"
							/>
							{saveError && (
								<output className="text-xs text-destructive">
									{I18n.get(saveError)}
								</output>
							)}
							<div className="flex justify-between gap-2">
								<button
									type="button"
									disabled={isSaving}
									onClick={() => {
										setIsOpen(false);
										onOpenChange?.(false);
										actionRef.current?.focus();
									}}
									className="rounded border px-2 py-1 disabled:opacity-50"
								>
									{I18n.get("highlight_memo_cancel")}
								</button>
								<button
									type="submit"
									disabled={isSaving || !draft.trim()}
									className="rounded bg-primary px-2 py-1 text-primary-foreground disabled:opacity-50"
								>
									{I18n.get("highlight_memo_save")}
								</button>
							</div>
						</form>
					)}
				</>
			)}
		</div>
	);
};
