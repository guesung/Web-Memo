import { useQueryClient } from "@tanstack/react-query";
import { useSupabaseUserQuery, useTabQuery } from "@web-memo/shared/hooks";
import { STORAGE_KEYS } from "@web-memo/shared/modules/chrome-storage";
import { I18n } from "@web-memo/shared/utils/extension";
import { useEffect, useRef, useState } from "react";
import { usePageContentContext } from "../../components/PageContentProvider";
import { requestAi } from "../../utils/aiRequest";
import { processStreamingResponse } from "../useSummary/util";

/** 현재 페이지에 속한 채팅 메시지입니다. */
export interface IFChatMessage {
	id: string;
	role: "user" | "assistant";
	content: string;
	timestamp: number;
}

/** 페이지별 대화를 유지하고 AI 실패에서도 질문과 부분 응답을 보존합니다. */
const useChat = () => {
	const [loadedStorageKey, setLoadedStorageKey] = useState<string | null>(null);
	const [messages, setMessages] = useState<IFChatMessage[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");
	const requestRef = useRef<AbortController | null>(null);
	const { data: tab } = useTabQuery();
	const { data: userResponse } = useSupabaseUserQuery();
	const userId = userResponse.data.user?.id;
	const storageKey = `${STORAGE_KEYS.chatMessages}:${userId ?? "signed-out"}:${tab?.url ?? ""}`;
	const storageKeyRef = useRef(storageKey);
	storageKeyRef.current = storageKey;
	const { content: pageContent } = usePageContentContext();
	const queryClient = useQueryClient();
	useEffect(() => {
		let isCurrentPage = true;
		setIsLoading(true);
		setLoadedStorageKey(null);
		setMessages([]);
		setError("");
		const loadMessages = async () => {
			try {
				const stored = await chrome.storage.local.get(storageKey);
				if (isCurrentPage && Array.isArray(stored[storageKey])) {
					setMessages(stored[storageKey]);
				}
			} catch {
				if (isCurrentPage) {
					setError(I18n.get("billing_ai_failed"));
				}
			} finally {
				if (isCurrentPage) {
					setIsLoading(false);
					setLoadedStorageKey(storageKey);
				}
			}
		};
		void loadMessages();

		return () => {
			isCurrentPage = false;
			requestRef.current?.abort();
			requestRef.current = null;
		};
	}, [storageKey]);
	const sendMessage = async (content: string) => {
		if (
			loadedStorageKey !== storageKey ||
			!userId ||
			!content.trim() ||
			requestRef.current ||
			isLoading
		) {
			return false;
		}
		if (!pageContent.trim()) {
			setError(I18n.get("error_get_page_content"));
			return false;
		}
		const controller = new AbortController();
		requestRef.current = controller;
		const requestStorageKey = storageKey;
		const userMessage: IFChatMessage = {
			id: crypto.randomUUID(),
			role: "user",
			content: content.trim(),
			timestamp: Date.now(),
		};
		const assistantMessage: IFChatMessage = {
			id: crypto.randomUUID(),
			role: "assistant",
			content: "",
			timestamp: Date.now(),
		};
		let isResponseComplete = false;
		let nextMessages = [...messages, userMessage, assistantMessage];
		setMessages(nextMessages);
		setIsLoading(true);
		setError("");
		try {
			const response = await requestAi({
				path: "/chat",
				expectedUserId: userId,
				body: {
					messages: [...messages, userMessage].map((message) => ({
						role: message.role,
						content: message.content,
					})),
					context: { pageContent },
				},
				signal: controller.signal,
			});
			isResponseComplete = true;
			await processStreamingResponse(
				response,
				(chunk) => {
					assistantMessage.content += chunk;
					nextMessages = [...messages, userMessage, { ...assistantMessage }];
					if (storageKeyRef.current === requestStorageKey) {
						setMessages(nextMessages);
					}
				},
				() => {
					isResponseComplete = false;
					if (storageKeyRef.current === requestStorageKey) {
						setError(I18n.get("billing_ai_failed"));
					}
				},
			);
		} catch (requestError) {
			isResponseComplete = false;
			if (storageKeyRef.current === requestStorageKey) {
				setError(
					requestError instanceof Error
						? requestError.message
						: I18n.get("billing_ai_failed"),
				);
			}
		} finally {
			try {
				await chrome.storage.local.set({ [requestStorageKey]: nextMessages });
			} catch {
				/* 메모 저장과 분리된 대화 저장 오류입니다. */
			}
			if (requestRef.current === controller) {
				requestRef.current = null;
				setIsLoading(false);
			}
			await queryClient.invalidateQueries({ queryKey: ["billing"] });
		}
		return isResponseComplete;
	};
	const clearMessages = async () => {
		if (requestRef.current) {
			return;
		}
		setMessages([]);
		setError("");
		await chrome.storage.local.remove(storageKey);
	};

	return {
		messages: loadedStorageKey === storageKey ? messages : [],
		isLoading,
		error,
		sendMessage,
		clearMessages,
	};
};

export default useChat;
