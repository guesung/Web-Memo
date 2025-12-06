import { useChat } from "@src/hooks";
import type { PropsWithChildren } from "react";
import { createContext, useContext } from "react";
import { usePageContentContext } from "../../PageContentProvider";

const ChatContext = createContext<ReturnType<typeof useChat> | null>(null);

export const useChatContext = () => {
	const context = useContext<ReturnType<typeof useChat> | null>(ChatContext);

	if (!context) throw new Error("ChatProvider가 없습니다.");
	return context;
};

export default function ChatProvider({ children }: PropsWithChildren) {
	const { content } = usePageContentContext();

	const chatProps = useChat({ pageContent: content });

	return (
		<ChatContext.Provider value={chatProps}>{children}</ChatContext.Provider>
	);
}
