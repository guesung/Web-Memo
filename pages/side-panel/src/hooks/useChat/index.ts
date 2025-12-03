import { CONFIG } from "@web-memo/env";
import type { Category } from "@web-memo/shared/modules/extension-bridge";
import { useCallback, useRef, useState } from "react";
import { processStreamingResponse } from "../useSummary/util";

export interface ChatMessage {
	id: string;
	role: "user" | "assistant";
	content: string;
	timestamp: number;
}

interface ChatContext {
	pageContent?: string;
	summary?: string;
	category?: Category;
}

interface UseChatReturn {
	messages: ChatMessage[];
	isLoading: boolean;
	error: string;
	sendMessage: (content: string) => Promise<void>;
	clearMessages: () => void;
	setContext: (context: ChatContext) => void;
}

function generateId(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function useChat(): UseChatReturn {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");
	const contextRef = useRef<ChatContext>({});

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

				const currentContext = contextRef.current;
				const response = await fetch(`${CONFIG.webUrl}/api/openai/chat`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						messages: chatMessages,
						context: {
							pageContent: currentContext.pageContent,
							summary: currentContext.summary,
							category: currentContext.category,
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
				setError(err instanceof Error ? err.message : "채팅 중 오류가 발생했습니다");
				setMessages((prev) => prev.slice(0, -1));
			} finally {
				setIsLoading(false);
			}
		},
		[messages, isLoading],
	);

	const clearMessages = useCallback(() => {
		setMessages([]);
		setError("");
	}, []);

	const updateContext = useCallback((newContext: ChatContext) => {
		contextRef.current = newContext;
	}, []);

	return {
		messages,
		isLoading,
		error,
		sendMessage,
		clearMessages,
		setContext: updateContext,
	};
}
