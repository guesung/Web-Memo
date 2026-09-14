import type { IFChatMessage } from "@src/hooks";
import { I18n } from "@web-memo/shared/utils/extension";
import { ScrollArea } from "@web-memo/ui";
import { MessageSquare } from "lucide-react";
import { useEffect, useRef } from "react";
import ChatMessage from "./ChatMessage";

/** 현재 페이지의 대화 목록입니다. */
interface IFChatMessagesProps {
	messages: IFChatMessage[];
}

/** 사용자가 이전 답변을 읽는 동안 자동 스크롤을 멈춥니다. */
const ChatMessages = ({ messages }: IFChatMessagesProps) => {
	const scrollAreaRef = useRef<HTMLDivElement>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const isAtBottomRef = useRef(true);
	const lastMessageContent = messages.at(-1)?.content;
	useEffect(() => {
		const scrollArea = scrollAreaRef.current?.querySelector(
			"[data-radix-scroll-area-viewport]",
		);
		if (!scrollArea) {
			return;
		}
		const handleConversationScroll = () => {
			isAtBottomRef.current =
				scrollArea.scrollHeight -
					scrollArea.scrollTop -
					scrollArea.clientHeight <
				50;
		};
		scrollArea.addEventListener("scroll", handleConversationScroll);

		return () =>
			scrollArea.removeEventListener("scroll", handleConversationScroll);
	}, []);
	useEffect(() => {
		if (!lastMessageContent || !isAtBottomRef.current) {
			return;
		}
		messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
	}, [lastMessageContent]);

	return (
		<ScrollArea ref={scrollAreaRef} className="flex-1 pr-2">
			{messages.length === 0 && (
				<div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
					<MessageSquare aria-hidden="true" className="h-8 w-8" />
					<p className="text-sm">{I18n.get("chat_empty_state")}</p>
				</div>
			)}
			<div className="flex flex-col gap-1 py-2">
				{messages.map((message) => (
					<ChatMessage key={message.id} message={message} />
				))}
				<div ref={messagesEndRef} />
			</div>
		</ScrollArea>
	);
};

export default ChatMessages;
