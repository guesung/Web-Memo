import type { ChatMessage as ChatMessageType } from "@src/hooks";
import { cn } from "@web-memo/ui";
import { Bot, User } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMessageProps {
	message: ChatMessageType;
}

export default function ChatMessage({ message }: ChatMessageProps) {
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
					className="markdown max-w-none prose prose-sm dark:prose-invert text-foreground"
				>
					{message.content || "..."}
				</Markdown>
			</div>
		</div>
	);
}
