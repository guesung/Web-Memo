import { I18n } from "@web-memo/shared/utils/extension";
import {
	Button,
	ErrorBoundary,
	Loading,
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@web-memo/ui";
import { GlobeIcon, RefreshCwIcon, SettingsIcon, Sparkles, Trash2, Youtube } from "lucide-react";
import { Chat, Summary, ToggleTheme } from ".";
import { useChatContext } from "./Chat/components";
import { useSummaryContext } from "./Summary/components";

interface TabSectionProps {
	activeTab: string;
	onTabChange: (value: string) => void;
	tabHeight: number;
}

export default function TabSection({
	activeTab,
	onTabChange,
	tabHeight,
}: TabSectionProps) {
	const { isSummaryLoading, refetchSummary, category } = useSummaryContext();
	const { messages, clearMessages } = useChatContext();

	const CategoryIcon = category === "youtube" ? Youtube : GlobeIcon;
	const hasMessages = messages.length > 0;

	return (
		<section
			className="flex flex-col overflow-hidden"
			style={{ height: `${tabHeight}%` }}
		>
			<header className="shrink-0 mt-4 flex items-center justify-between">
				<h1 className="text-lg font-bold">Web Memo</h1>
				<div className="flex gap-1">
					<ToggleTheme />
					<Button
						variant="outline"
						size="sm"
						onClick={() => chrome.runtime.openOptionsPage()}
					>
						<SettingsIcon size={16} />
					</Button>
				</div>
			</header>
			<Tabs
				value={activeTab}
				onValueChange={onTabChange}
				className="flex flex-col flex-1 min-h-0 overflow-hidden"
			>
				<TabsList className="shrink-0 mt-3 w-full grid grid-cols-2">
					<TabsTrigger value="summary" className="flex items-center gap-1.5">
						<CategoryIcon size={14} />
						{I18n.get("summary")}
						<button
							type="button"
							className="ml-1 p-0.5 rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
							disabled={isSummaryLoading}
							onClick={(e) => {
								e.stopPropagation();
								if (!isSummaryLoading) refetchSummary();
							}}
						>
							{isSummaryLoading ? (
								<Loading className="size-3.5" />
							) : (
								<RefreshCwIcon size={14} />
							)}
						</button>
					</TabsTrigger>
					<TabsTrigger value="chat" className="flex items-center gap-1.5">
						<Sparkles size={14} />
						{I18n.get("chat_title")}
						{hasMessages && (
							<button
								type="button"
								className="ml-1 p-0.5 rounded hover:bg-muted"
								onClick={(e) => {
									e.stopPropagation();
									clearMessages();
								}}
							>
								<Trash2 size={14} />
							</button>
						)}
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
