import { useChat, type UseChatReturn } from "@src/hooks";
import type { PropsWithChildren } from "react";
import { createContext, useContext } from "react";

const ChatContext = createContext<UseChatReturn | null>(null);

export function useChatContext(): UseChatReturn {
	const context = useContext(ChatContext);

	if (!context) throw new Error("ChatProvider가 없습니다.");
	return context;
}

export default function ChatProvider({ children }: PropsWithChildren) {
	return (
		<ChatContext.Provider value={useChat()}>{children}</ChatContext.Provider>
	);
}
