import type { ChatMessage as ChatMessageType } from "@src/hooks";
import { I18n } from "@web-memo/shared/utils/extension";
import { ScrollArea } from "@web-memo/ui";
import { MessageSquare } from "lucide-react";
import { useEffect, useRef } from "react";
import ChatMessage from "./ChatMessage";

interface ChatMessagesProps {
	messages: ChatMessageType[];
}

export default function ChatMessages({ messages }: ChatMessagesProps) {
	const scrollRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
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
		<ScrollArea className="flex-1 pr-2" ref={scrollRef}>
			<div className="flex flex-col gap-1 py-2">
				{messages.map((message) => (
					<ChatMessage key={message.id} message={message} />
				))}
			</div>
		</ScrollArea>
	);
}
