import { Header, MemoSection, ResizeHandle, TabSection } from "@src/components";
import { useResizablePanel } from "@src/hooks";
import { useDidMount, useTabQuery } from "@web-memo/shared/hooks";
import { bridge } from "@web-memo/shared/modules/extension-bridge";
import { usePageContentContext } from "./TabSection/components";
export default function SidePanelContent() {
	const { tabHeight, memoHeight, isResizing, handleMouseDown, containerRef } =
		useResizablePanel();
	const { fetchPageContent } = usePageContentContext();
	const { refetch: refetchTab } = useTabQuery();

	useDidMount(() => {
		bridge.handle.UPDATE_SIDE_PANEL(() => {
			fetchPageContent();
			refetchTab();
		});
	});

	return (
		<main
			ref={containerRef}
			className="bg-background text-foreground relative flex h-lvh flex-col px-4 max-w-none overflow-x-hidden"
		>
			<Header />
			<TabSection tabHeight={tabHeight} />
			<ResizeHandle
				tabHeight={tabHeight}
				isResizing={isResizing}
				onMouseDown={handleMouseDown}
			/>
			<MemoSection memoHeight={memoHeight} />
		</main>
	);
}
