import { captureException } from "@sentry/react";
import { CONFIG } from "@web-memo/env";
import { analytics } from "@web-memo/shared/modules/analytics";
import { STORAGE_KEYS } from "@web-memo/shared/modules/chrome-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePageContentContext } from "../../components/PageContentProvider";
import { processStreamingResponse } from "../useSummary/util";

const ERROR_REPORTING_WINDOW_MS = 8_000;
const ERROR_FEATURE = "chat";
const ERROR_OPERATION = "send";

const isExpectedChatError = (error: unknown): boolean => {
	if (!(error instanceof Error)) return false;
	return error.name === "AbortError";
};

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

function generateId(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function useChat(): UseChatReturn {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");
	const isInitialized = useRef(false);
	const lastErrorRef = useRef(new Map<string, number>());

	const { content: pageContent } = usePageContentContext();

	const reportChatFailure = useCallback(
		(
			error: unknown,
			stage: "reader" | "parse" | "server" | "fetch" | "general",
		) => {
			if (isExpectedChatError(error)) return;

			const errorMessage =
				error instanceof Error ? error.message : String(error);
			const chatErrorMessage = errorMessage || "unknown-chat-error";
			const now = Date.now();
			const fingerprint = `${ERROR_FEATURE}|${ERROR_OPERATION}|${stage}|${chatErrorMessage.slice(0, 120)}`;
			const last = lastErrorRef.current.get(fingerprint) ?? 0;
			if (now - last < ERROR_REPORTING_WINDOW_MS) return;
			lastErrorRef.current.set(fingerprint, now);

			captureException(
				error instanceof Error ? error : new Error(chatErrorMessage),
				{
					level: "error",
					tags: {
						feature: ERROR_FEATURE,
						operation: ERROR_OPERATION,
						stage,
					},
					fingerprint: [ERROR_FEATURE, ERROR_OPERATION, stage],
					extra: {
						feature: ERROR_FEATURE,
						operation: ERROR_OPERATION,
						stage,
						occurredAt: now,
					},
				},
			);
		},
		[],
	);

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

			analytics.trackEvent({ name: "chat_message_send" });

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
					reportChatFailure(
						new Error(`채팅 API 응답 실패: ${response.status}`),
						"fetch",
					);
					setError(`HTTP error! status: ${response.status}`);
					setMessages((prev) => prev.slice(0, -1));
					return;
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
					(errorMessage, streamFailureStage) => {
						reportChatFailure(new Error(errorMessage), streamFailureStage);
						setError(errorMessage);
						setMessages((prev) => prev.slice(0, -1));
					},
				);
			} catch (err) {
				if (!isExpectedChatError(err)) {
					console.error("Chat error:", err);
					analytics.trackEvent({
						name: "chat_fail",
						params: { reason: err instanceof Error ? err.message : "unknown" },
					});
					reportChatFailure(err, "general");
					setError(
						err instanceof Error ? err.message : "채팅 중 오류가 발생했습니다",
					);
					setMessages((prev) => prev.slice(0, -1));
				}
			} finally {
				setIsLoading(false);
			}
		},
		[messages, isLoading, pageContent, reportChatFailure],
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
