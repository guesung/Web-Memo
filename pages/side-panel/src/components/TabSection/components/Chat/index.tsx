import { ChatInput, ChatMessages, useChatContext } from "./components";

export default function Chat() {
	const { messages, isLoading, error, sendMessage } = useChatContext();

	return (
		<div className="flex h-full flex-col pt-2">
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
