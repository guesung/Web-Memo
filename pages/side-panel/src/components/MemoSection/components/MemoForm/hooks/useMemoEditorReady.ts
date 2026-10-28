import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "@web-memo/shared/constants";
import { analytics } from "@web-memo/shared/modules/analytics";
import { getPageKey, getPathKey } from "@web-memo/shared/utils";
import { type RefObject, useEffect, useRef } from "react";

interface IFMemoEditorReadyProps {
	userId: string | undefined;
	tab: { id?: number; url?: string } | undefined;
	textareaRef: RefObject<HTMLTextAreaElement | null>;
	isMemoLocked: boolean;
	isMemoLoadFailed: boolean;
}

/** 후보 조회와 화면 노출이 모두 확인된 편집 범위마다 준비 이벤트를 한 번 시도한다. */
export default function useMemoEditorReady({
	userId,
	tab,
	textareaRef,
	isMemoLocked,
	isMemoLoadFailed,
}: IFMemoEditorReadyProps) {
	const queryClient = useQueryClient();
	const attemptedScopes = useRef(new Set<string>());

	useEffect(() => {
		if (
			!userId ||
			tab?.id === undefined ||
			!tab.url ||
			isMemoLocked ||
			isMemoLoadFailed
		) {
			return;
		}
		let pageKey: string;
		let pathKey: string;
		try {
			pageKey = getPageKey(tab.url);
			pathKey = getPathKey(tab.url);
		} catch {
			return;
		}
		const scope = JSON.stringify([userId, tab.id, pageKey]);
		if (attemptedScopes.current.has(scope)) return;
		const textarea = textareaRef.current;
		if (!textarea) return;

		const checkReady = () => {
			if (attemptedScopes.current.has(scope)) return;
			const candidates = [
				queryClient.getQueryState<{ error?: unknown }>(
					QUERY_KEY.memo({ url: pageKey }),
				),
				queryClient.getQueryState<{ error?: unknown }>(
					QUERY_KEY.samePathMemos(pathKey),
				),
			];
			const hasLoadedCandidates = candidates.every(
				(query) =>
					query?.status === "success" &&
					query.data !== undefined &&
					!query.data.error,
			);
			if (
				!hasLoadedCandidates ||
				document.visibilityState !== "visible" ||
				!textarea.isConnected ||
				textarea.disabled ||
				textarea.readOnly ||
				!Array.from(textarea.getClientRects()).some(
					(rect) => rect.width > 0 && rect.height > 0,
				) ||
				getComputedStyle(textarea).visibility !== "visible"
			)
				return;

			attemptedScopes.current.add(scope);
			void analytics
				.trackEvent(
					{ name: "memo_editor_ready", params: { source: "side_panel" } },
					userId,
				)
				.catch(() => {});
		};
		const unsubscribe = queryClient.getQueryCache().subscribe(checkReady);
		const resizeObserver = new ResizeObserver(checkReady);
		resizeObserver.observe(textarea);
		const mutationObserver = new MutationObserver(checkReady);
		mutationObserver.observe(document.body, {
			attributes: true,
			subtree: true,
			attributeFilter: ["class", "style", "hidden", "disabled", "readonly"],
		});
		document.addEventListener("visibilitychange", checkReady);
		checkReady();
		return () => {
			unsubscribe();
			resizeObserver.disconnect();
			mutationObserver.disconnect();
			document.removeEventListener("visibilitychange", checkReady);
		};
	}, [
		queryClient,
		userId,
		tab?.id,
		tab?.url,
		textareaRef,
		isMemoLocked,
		isMemoLoadFailed,
	]);
}
