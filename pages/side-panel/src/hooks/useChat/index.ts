import { CONFIG } from "@web-memo/env";
import { STORAGE_KEYS } from "@web-memo/shared/modules/chrome-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePageContentContext } from "../../components/PageContentProvider";
import { processStreamingResponse } from "../useSummary/util";

export interface ChatMessage {
	id: string;
	role: "user" | "assistant";
	content: string;
	timestamp: number;
}

export interface UseChatReturn {
	messages: ChatMessage[];
	isLoading: boolean;
	error: string;
	sendMessage: (content: string) => Promise<void>;
	clearMessages: () => void;
}

function generateId(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function useChat(): UseChatReturn {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");
	const isInitialized = useRef(false);

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
		if (!isInitialized.current) return;

		const saveMessages = async () => {
			try {
				await chrome.storage.local.set({
					[STORAGE_KEYS.chatMessages]: messages,
				});
			} catch (error) {
				console.error("Failed to save chat messages:", error);
			}
		};

		saveMessages();
	}, [messages]);

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

				const response = await fetch(`${CONFIG.webUrl}/api/openai/chat`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						messages: chatMessages,
						context: {
							pageContent,
						},
					}),
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
