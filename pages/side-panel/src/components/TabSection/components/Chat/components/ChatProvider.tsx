import { useChat } from "@src/hooks";
import type { PropsWithChildren } from "react";
import { createContext, useContext } from "react";

const ChatContext = createContext<ReturnType<typeof useChat> | null>(null);

export const useChatContext = () => {
	const context = useContext<ReturnType<typeof useChat> | null>(ChatContext);

	if (!context) throw new Error("ChatProvider가 없습니다.");
	return context;
};

export default function ChatProvider({ children }: PropsWithChildren) {
	const chatProps = useChat();

	return (
		<ChatContext.Provider value={chatProps}>{children}</ChatContext.Provider>
	);
}
