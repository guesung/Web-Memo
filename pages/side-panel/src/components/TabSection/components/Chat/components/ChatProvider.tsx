import { useChat } from "@src/hooks";
import type { PropsWithChildren } from "react";
import { createContext, useContext } from "react";

const ChatContext = createContext<ReturnType<typeof useChat> | null>(null);

export function useChatContext(): ReturnType<typeof useChat> {
	const context = useContext(ChatContext);

	if (!context) throw new Error("ChatProvider가 없습니다.");
	return context;
}

export default function ChatProvider({ children }: PropsWithChildren) {
	return (
		<ChatContext.Provider value={useChat()}>{children}</ChatContext.Provider>
	);
}
