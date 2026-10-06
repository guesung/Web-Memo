import { Header, MemoSection, ResizeHandle, TabSection } from "@src/components";
import { useResizablePanel } from "@src/hooks";
import {
	useAiFeatureSettingsQuery,
	useDidMount,
	useTabQuery,
} from "@web-memo/shared/hooks";
import { bridge } from "@web-memo/shared/modules/extension-bridge";
import { usePageContentContext } from "./PageContentProvider";
export default function SidePanelContent() {
	const { tabHeight, memoHeight, isResizing, handleMouseDown, containerRef } =
		useResizablePanel();
	const { fetchPageContent } = usePageContentContext();
	const { refetch: refetchTab } = useTabQuery();
	const { showSummary, showAiChat } = useAiFeatureSettingsQuery();
	// 기본이 꺼짐이라 설정을 읽는 동안·읽지 못했을 때는 탭 영역을 그리지 않는다. 둘 중 하나라도 켜져야 나타난다.
	const hasAiTab = showSummary || showAiChat;

	useDidMount(() => {
		bridge.handle.UPDATE_SIDE_PANEL(() => {
			refetchTab();
			fetchPageContent();
		});
		fetchPageContent();
	});

	return (
		<main
			ref={containerRef}
			className="bg-background text-foreground relative flex h-lvh flex-col px-4 max-w-none overflow-x-hidden"
		>
			<Header />
			{hasAiTab && (
				<>
					<TabSection
						tabHeight={tabHeight}
						isSummaryEnabled={showSummary}
						isChatEnabled={showAiChat}
					/>
					<ResizeHandle
						upperSectionRatio={tabHeight}
						isResizing={isResizing}
						onMouseDown={handleMouseDown}
					/>
				</>
			)}
			<MemoSection memoHeight={hasAiTab ? memoHeight : 100} />
		</main>
	);
}
