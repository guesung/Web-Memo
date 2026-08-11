import { CONFIG } from "@web-memo/env";
import { STORAGE_KEYS } from "@web-memo/shared/modules/chrome-storage";
import { getSupabaseAccessToken } from "@web-memo/shared/utils/extension";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePageContentContext } from "../../components/PageContentProvider";
import { processStreamingResponse } from "../useSummary/util";

export interface ChatMessage {
	id: string;
	role: "user" | "assistant";
	content: string;
	timestamp: number;
}

interface UseChatReturn {
	messages: ChatMessage[];
	isLoading: boolean;
	error: string;
	sendMessage: (content: string) => Promise<void>;
	clearMessages: () => void;
}

/** chrome.storage 용량이 무한히 늘지 않도록 보관하는 대화 개수의 상한 */
const MAX_STORED_MESSAGES = 100;

function generateId(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function useChat(): UseChatReturn {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");
	const isInitialized = useRef(false);
	const abortControllerRef = useRef<AbortController | null>(null);

	const { content: pageContent } = usePageContentContext();

	useEffect(() => {
		if (isInitialized.current) return;

		const loadMessages = async () => {
			try {
				const stored = await chrome.storage.local.get(
					STORAGE_KEYS.chatMessages,
				);
				if (stored[STORAGE_KEYS.chatMessages]) {
					setMessages(stored[STORAGE_KEYS.chatMessages]);
				}
			} catch (error) {
				console.error("Failed to load chat messages:", error);
			} finally {
				isInitialized.current = true;
			}
		};

		loadMessages();
	}, []);

	useEffect(() => {
		// 스트리밍 중에는 토큰마다 이 effect가 실행되므로,
		// 응답이 끝나 isLoading이 풀린 시점에만 최종 상태를 1회 저장한다.
		if (!isInitialized.current || isLoading) return;

		const saveMessages = async () => {
			try {
				await chrome.storage.local.set({
					[STORAGE_KEYS.chatMessages]: messages.slice(-MAX_STORED_MESSAGES),
				});
			} catch (error) {
				console.error("Failed to save chat messages:", error);
			}
		};

		saveMessages();
	}, [messages, isLoading]);

	useEffect(() => {
		// 사이드 패널이 닫히면 진행 중인 스트리밍 요청을 중단한다.
		return () => {
			abortControllerRef.current?.abort();
		};
	}, []);

	const sendMessage = useCallback(
		async (content: string) => {
			if (!content.trim() || isLoading) return;

			setError("");

			const userMessage: ChatMessage = {
				id: generateId(),
				role: "user",
				content: content.trim(),
				timestamp: Date.now(),
			};

			setMessages((prev) => [...prev, userMessage]);
			setIsLoading(true);

			const assistantMessage: ChatMessage = {
				id: generateId(),
				role: "assistant",
				content: "",
				timestamp: Date.now(),
			};

			setMessages((prev) => [...prev, assistantMessage]);

			try {
				const chatMessages = [...messages, userMessage].map((msg) => ({
					role: msg.role,
					content: msg.content,
				}));

				const accessToken = await getSupabaseAccessToken();

				abortControllerRef.current?.abort();
				abortControllerRef.current = new AbortController();

				const response = await fetch(`${CONFIG.webUrl}/api/openai/chat`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						...(accessToken && { Authorization: `Bearer ${accessToken}` }),
					},
					body: JSON.stringify({
						messages: chatMessages,
						context: {
							pageContent,
						},
					}),
					signal: abortControllerRef.current.signal,
				});

				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				await processStreamingResponse(
					response,
					(streamContent) => {
						setMessages((prev) => {
							const updated = [...prev];
							const lastIndex = updated.length - 1;
							if (updated[lastIndex]?.role === "assistant") {
								updated[lastIndex] = {
									...updated[lastIndex],
									content: updated[lastIndex].content + streamContent,
								};
							}
							return updated;
						});
					},
					(errorMessage) => {
						setError(errorMessage);
						setMessages((prev) => prev.slice(0, -1));
					},
				);
			} catch (err) {
				// 패널을 닫아 요청을 중단한 경우는 에러가 아니다.
				if (err instanceof DOMException && err.name === "AbortError") {
					return;
				}

				console.error("Chat error:", err);
				setError(
					err instanceof Error ? err.message : "채팅 중 오류가 발생했습니다",
				);
				setMessages((prev) => prev.slice(0, -1));
			} finally {
				setIsLoading(false);
			}
		},
		[messages, isLoading, pageContent],
	);

	const clearMessages = useCallback(async () => {
		setMessages([]);
		setError("");
		try {
			await chrome.storage.local.remove(STORAGE_KEYS.chatMessages);
		} catch (error) {
			console.error("Failed to clear chat messages from storage:", error);
		}
	}, []);

	return {
		messages,
		isLoading,
		error,
		sendMessage,
		clearMessages,
	};
}
