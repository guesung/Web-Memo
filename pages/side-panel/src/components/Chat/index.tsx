import { useChat } from "@src/hooks";
import { I18n } from "@web-memo/shared/utils/extension";
import { Button } from "@web-memo/ui";
import { Trash2 } from "lucide-react";
import { useEffect } from "react";
import { useSummaryContext } from "../Summary/components/SummaryProvider";
import { ChatInput, ChatMessages } from "./components";

export default function Chat() {
	const { summary, category, pageContent } = useSummaryContext();
	const { messages, isLoading, error, sendMessage, clearMessages, setContext } =
		useChat();

	useEffect(() => {
		setContext({
			pageContent,
			summary,
			category,
		});
	}, [pageContent, summary, category, setContext]);

	return (
		<div className="flex h-full flex-col pt-2">
			{messages.length > 0 && (
				<div className="flex justify-end pb-1">
					<Button
						variant="ghost"
						size="sm"
						onClick={clearMessages}
						aria-label={I18n.get("chat_clear")}
					>
						<Trash2 size={14} />
					</Button>
				</div>
			)}

			<div className="flex flex-1 flex-col overflow-hidden">
				<ChatMessages messages={messages} />

				{error && (
					<p className="text-destructive text-sm py-1">{error}</p>
				)}

				<div className="pt-2 pb-1">
					<ChatInput onSend={sendMessage} disabled={isLoading} />
				</div>
			</div>
		</div>
	);
}
