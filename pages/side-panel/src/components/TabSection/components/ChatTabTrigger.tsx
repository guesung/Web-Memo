import { I18n } from "@web-memo/shared/utils/extension";
import { TabsTrigger } from "@web-memo/ui";
import { Sparkles, Trash2 } from "lucide-react";
import { useChatContext } from "../../Chat/components";

export default function ChatTabTrigger() {
	const { messages, clearMessages } = useChatContext();

	const hasMessages = messages.length > 0;

	const handleClear = (e: React.MouseEvent) => {
		e.stopPropagation();
		clearMessages();
	};

	return (
		<TabsTrigger value="chat" className="flex items-center gap-1.5">
			<Sparkles size={14} />
			{I18n.get("chat_title")}
			{hasMessages && (
				<button
					type="button"
					className="ml-1 p-0.5 rounded hover:bg-muted"
					onClick={handleClear}
				>
					<Trash2 size={14} />
				</button>
			)}
		</TabsTrigger>
	);
}
