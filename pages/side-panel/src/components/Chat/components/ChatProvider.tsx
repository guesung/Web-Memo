import { useChat } from "@src/hooks";
import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect } from "react";
import { useSummaryContext } from "../../Summary/components";

type ChatContextType = ReturnType<typeof useChat>;

const ChatContext = createContext<ChatContextType | null>(null);

export const useChatContext = () => {
	const context = useContext(ChatContext);
	if (!context) throw new Error("ChatProvider가 없습니다.");
	return context;
};

export default function ChatProvider({ children }: PropsWithChildren) {
	const { summary, category, pageContent } = useSummaryContext();
	const chatProps = useChat();

	useEffect(() => {
		chatProps.setContext({
			pageContent,
			summary,
			category,
		});
	}, [pageContent, summary, category, chatProps.setContext]);

	return (
		<ChatContext.Provider value={chatProps}>{children}</ChatContext.Provider>
	);
}
