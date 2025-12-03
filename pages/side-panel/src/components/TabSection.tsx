import { I18n } from "@web-memo/shared/utils/extension";
import {
	ErrorBoundary,
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@web-memo/ui";
import { FileText, MessageSquare } from "lucide-react";
import { Chat, Summary } from ".";

export default function TabSection({
	activeTab,
	onTabChange,
	height,
}: TabSectionProps) {
	return (
		<section
			className="flex flex-col overflow-hidden"
			style={{ height: `${height}%` }}
		>
			<Tabs
				value={activeTab}
				onValueChange={onTabChange}
				className="flex flex-col h-full"
			>
				<TabsList className="mt-4 w-full grid grid-cols-2">
					<TabsTrigger value="summary" className="flex items-center gap-1.5">
						<FileText size={14} />
						{I18n.get("summary")}
					</TabsTrigger>
					<TabsTrigger value="chat" className="flex items-center gap-1.5">
						<MessageSquare size={14} />
						{I18n.get("chat_title")}
					</TabsTrigger>
				</TabsList>

				<TabsContent value="summary" className="flex-1 overflow-y-auto mt-0">
					<ErrorBoundary>
						<Summary />
					</ErrorBoundary>
				</TabsContent>

				<TabsContent value="chat" className="flex-1 overflow-hidden mt-0">
					<ErrorBoundary>
						<Chat />
					</ErrorBoundary>
				</TabsContent>
			</Tabs>
		</section>
	);
}

interface TabSectionProps {
	activeTab: string;
	onTabChange: (value: string) => void;
	height: number;
}
