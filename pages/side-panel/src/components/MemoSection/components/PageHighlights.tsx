import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	HIGHLIGHT_COLOR_STYLE,
	type HighlightColor,
} from "@web-memo/shared/constants";
import { useSupabaseClientQuery } from "@web-memo/shared/hooks";
import { analytics } from "@web-memo/shared/modules/analytics";
import { bridge } from "@web-memo/shared/modules/extension-bridge";
import type { HighlightRow } from "@web-memo/shared/types";
import {
	getPageKey,
	HighlightService,
	isNetworkError,
} from "@web-memo/shared/utils";
import { I18n } from "@web-memo/shared/utils/extension";
import { ArrowUpRight, ChevronDown, Highlighter } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

const PREVIEW_COUNT = 2;

/** 현재 페이지의 인용을 선택된 메모와 독립적으로 보여준다. */
export default function PageHighlights({ userId, tabId, url }: Props) {
	const { data: supabaseClient } = useSupabaseClientQuery();
	const queryClient = useQueryClient();
	const pageKey = url ? getPageKey(url) : "";
	const queryKey = ["pageHighlights", userId, pageKey] as const;
	const { data, isPending, isError, refetch } = useQuery({
		queryKey,
		enabled: Boolean(pageKey),
		queryFn: async () => {
			const result = await new HighlightService(
				supabaseClient,
			).getHighlightsByUrl(url);
			if (result.error) throw result.error;
			return (result.data ?? []).sort(
				(left, right) =>
					right.created_at.localeCompare(left.created_at) || right.id - left.id,
			);
		},
		// online 직후에도 연결이 준비되지 않을 수 있어 전송 실패만 제한적으로 재시도한다.
		retry: (failureCount, error) => failureCount < 2 && isNetworkError(error),
	});
	const [isCollapsed, setIsCollapsed] = useState(false);
	const [showAll, setShowAll] = useState(false);
	const [focusFailed, setFocusFailed] = useState(false);
	const bodyRef = useRef<HTMLDivElement>(null);
	const previousHeightRef = useRef<number | null>(null);

	useLayoutEffect(() => {
		const body = bodyRef.current;
		const previousHeight = previousHeightRef.current;
		previousHeightRef.current = null;
		if (
			!body ||
			previousHeight === null ||
			window.matchMedia("(prefers-reduced-motion: reduce)").matches
		)
			return;
		const nextHeight = body.getBoundingClientRect().height;
		if (Math.abs(nextHeight - previousHeight) < 1) return;
		const animation = body.animate(
			[{ height: `${previousHeight}px` }, { height: `${nextHeight}px` }],
			{ duration: 180, easing: "cubic-bezier(.22, 1, .36, 1)" },
		);
		return () => animation.cancel();
	});

	useEffect(() => {
		return bridge.handle.HIGHLIGHTS_CHANGED(({ pageKey: changedPageKey }) => {
			void queryClient.invalidateQueries({
				queryKey: ["pageHighlights", userId, changedPageKey],
				exact: true,
			});
		});
	}, [queryClient, userId]);

	const highlights = data ?? [];
	const isLoading = Boolean(pageKey) && isPending;
	const visibleHighlights = showAll
		? highlights
		: highlights.slice(0, PREVIEW_COUNT);
	const handleQuoteClick = async (id: number) => {
		setFocusFailed(false);
		if (tabId === undefined || !pageKey) {
			setFocusFailed(true);
			return;
		}
		try {
			const result = await bridge.request.FOCUS_HIGHLIGHT({
				tabId,
				pageKey,
				id,
			});
			if (result?.success) {
				void analytics.trackEvent({ name: "highlight_source_jump" });
			} else {
				setFocusFailed(true);
			}
		} catch {
			setFocusFailed(true);
		}
	};

	return (
		<section
			aria-label={I18n.get("page_highlights_title")}
			className="flex min-h-0 shrink-0 flex-col border-b border-border pb-2"
			style={{ maxHeight: "min(18rem, 50%)" }}
		>
			<button
				type="button"
				aria-expanded={!isCollapsed}
				className="flex min-h-10 w-full shrink-0 items-center gap-2 text-left text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				onClick={() => setIsCollapsed((value) => !value)}
			>
				<Highlighter aria-hidden className="size-4 shrink-0" />
				<span className="min-w-0 flex-1 truncate text-sm font-medium">
					{I18n.get("page_highlights_title")}
				</span>
				<span className="text-xs">{highlights.length}</span>
				<ChevronDown
					aria-hidden
					className={`size-4 shrink-0 text-muted-foreground transition-transform duration-[180ms] ease-out motion-reduce:transition-none ${isCollapsed ? "-rotate-90" : ""}`}
				/>
			</button>
			<div
				ref={bodyRef}
				data-testid="highlights-body"
				className={`grid min-h-0 transition-[grid-template-rows] duration-[180ms] ease-out motion-reduce:transition-none ${isCollapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]"}`}
			>
				<div
					className="min-h-0 overflow-y-auto"
					inert={isCollapsed}
					aria-hidden={isCollapsed}
				>
					<div className="pt-1">
						{isLoading && <LoadingState />}
						{isError && (
							<p className="py-2 text-xs text-muted-foreground">
								{I18n.get("page_highlights_load_failed")}{" "}
								<button
									type="button"
									className="text-primary underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
									onClick={() => void refetch()}
								>
									{I18n.get("page_highlights_retry")}
								</button>
							</p>
						)}
						{!isLoading && !isError && highlights.length === 0 && (
							<p className="py-2 text-xs text-muted-foreground">
								{I18n.get("page_highlights_empty")}
							</p>
						)}
						{!isError && visibleHighlights.length > 0 && (
							<>
								<ul>
									{visibleHighlights.map((highlight) => (
										<li key={highlight.id}>
											<QuoteButton
												highlight={highlight}
												onClick={() => void handleQuoteClick(highlight.id)}
											/>
										</li>
									))}
								</ul>
								{highlights.length > PREVIEW_COUNT && (
									<button
										type="button"
										className="mt-1 w-full text-right text-xs text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
										onClick={() => {
											previousHeightRef.current =
												bodyRef.current?.getBoundingClientRect().height ?? null;
											setShowAll((value) => !value);
										}}
									>
										{showAll
											? I18n.get("page_highlights_show_less")
											: I18n.get(
													"page_highlights_show_all",
													String(highlights.length),
												)}
									</button>
								)}
							</>
						)}
						{focusFailed && (
							<p role="alert" className="mt-1 text-xs text-destructive">
								{I18n.get("page_highlights_focus_failed")}
							</p>
						)}
					</div>
				</div>
			</div>
		</section>
	);
}

function QuoteButton({ highlight, onClick }: QuoteButtonProps) {
	const color = highlight.color as HighlightColor;
	const colorStyle = HIGHLIGHT_COLOR_STYLE[color];
	return (
		<button
			type="button"
			className="flex w-full items-start gap-2 rounded-md py-2 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			onClick={onClick}
		>
			<span className="min-w-0 flex-1 line-clamp-2 whitespace-pre-wrap break-words text-sm leading-5">
				<mark
					className={`box-decoration-clone rounded-sm px-0.5 ${color === "yellow" ? "bg-highlight-yellow text-highlight-yellow-foreground" : "text-foreground"}`}
					style={
						color !== "yellow"
							? { backgroundColor: colorStyle?.background }
							: undefined
					}
				>
					{highlight.exact_text}
				</mark>
			</span>
			<ArrowUpRight
				aria-hidden
				className="mt-0.5 size-3 shrink-0 text-muted-foreground"
			/>
		</button>
	);
}

function LoadingState() {
	return (
		<output
			aria-label={I18n.get("page_highlights_loading")}
			className="block animate-pulse space-y-2 py-2"
		>
			<div className="h-2.5 rounded bg-border" />
			<div className="h-2.5 w-2/3 rounded bg-border" />
		</output>
	);
}

interface Props {
	userId: string;
	tabId?: number;
	url: string;
}

interface QuoteButtonProps {
	highlight: HighlightRow;
	onClick: () => void;
}
