import type { ChatMessage as ChatMessageType } from "@src/hooks";
import { I18n } from "@web-memo/shared/utils/extension";
import { ScrollArea } from "@web-memo/ui";
import { MessageSquare } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import ChatMessage from "./ChatMessage";

interface ChatMessagesProps {
	messages: ChatMessageType[];
}

export default function ChatMessages({ messages }: ChatMessagesProps) {
	const scrollAreaRef = useRef<HTMLDivElement>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const isAtBottomRef = useRef(true);

	const checkIfAtBottom = useCallback(() => {
		const scrollArea = scrollAreaRef.current?.querySelector(
			"[data-radix-scroll-area-viewport]",
		);
		if (!scrollArea) return true;

		const { scrollTop, scrollHeight, clientHeight } = scrollArea;
		const threshold = 50;
		return scrollHeight - scrollTop - clientHeight < threshold;
	}, []);

	const handleScroll = useCallback(() => {
		isAtBottomRef.current = checkIfAtBottom();
	}, [checkIfAtBottom]);

	useEffect(() => {
		const scrollArea = scrollAreaRef.current?.querySelector(
			"[data-radix-scroll-area-viewport]",
		);
		if (!scrollArea) return;

		scrollArea.addEventListener("scroll", handleScroll);
		return () => scrollArea.removeEventListener("scroll", handleScroll);
	}, [handleScroll]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: messages 의존성 제거 시 스크롤 이동 이슈 발생
	useEffect(() => {
		if (isAtBottomRef.current) {
			messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
		}
	}, [messages]);

	if (messages.length === 0) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
				<MessageSquare className="h-8 w-8" />
				<p className="text-sm">{I18n.get("chat_empty_state")}</p>
			</div>
		);
	}

	return (
		<ScrollArea ref={scrollAreaRef} className="flex-1 pr-2">
			<div className="flex flex-col gap-1 py-2">
				{messages.map((message) => (
					<ChatMessage key={message.id} message={message} />
				))}
				<div ref={messagesEndRef} />
			</div>
		</ScrollArea>
	);
}
