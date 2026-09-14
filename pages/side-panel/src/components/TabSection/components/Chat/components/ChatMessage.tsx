import type { IFChatMessage as ChatMessageType } from "@src/hooks";
import { cn } from "@web-memo/ui";
import { Bot, User } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** 화면에 전달하는 속성입니다. */
interface IFChatMessageProps {
	message: ChatMessageType;
}

/** 기존 화면 구조와 접근성을 유지하는 컴포넌트입니다. */
const ChatMessage = ({ message }: IFChatMessageProps) => {
	const isUser = message.role === "user";

	return (
		<div
			className={cn(
				"flex gap-2 py-2",
				isUser ? "flex-row-reverse" : "flex-row",
			)}
		>
			<div
				className={cn(
					"flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
					isUser ? "bg-primary" : "bg-muted",
				)}
			>
				{isUser ? (
					<User className="h-4 w-4 text-primary-foreground" />
				) : (
					<Bot className="h-4 w-4 text-muted-foreground" />
				)}
			</div>
			<div
				className={cn(
					"rounded-lg px-3 py-2 text-sm max-w-[85%]",
					isUser
						? "bg-primary text-primary-foreground"
						: "bg-muted text-foreground",
				)}
			>
				<Markdown
					remarkPlugins={[remarkGfm]}
					className="markdown max-w-none prose prose-sm text-foreground"
				>
					{message.content || "..."}
				</Markdown>
			</div>
		</div>
	);
};

export default ChatMessage;
