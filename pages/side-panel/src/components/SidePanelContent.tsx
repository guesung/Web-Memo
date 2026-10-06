import { Header, MemoSection, ResizeHandle, TabSection } from "@src/components";
import { useResizablePanel } from "@src/hooks";
import {
	useAiFeatureSettings,
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
	const { isLoaded, hasLoadFailed, isSummaryEnabled, isChatEnabled } =
		useAiFeatureSettings();
	// 값을 읽는 동안과 읽지 못했을 때는 켜짐이라 기존 레이아웃 그대로다. 둘 다 꺼야만 탭 영역이 사라진다.
	const hasAiTab = isSummaryEnabled || isChatEnabled;
	const isAiSettingResolved = isLoaded || hasLoadFailed;

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
					{isAiSettingResolved ? (
						<TabSection
							tabHeight={tabHeight}
							isSummaryEnabled={isSummaryEnabled}
							isChatEnabled={isChatEnabled}
						/>
					) : (
						// 설정을 읽는 동안 메모 영역이 위아래로 밀리지 않도록 탭 영역 자리만 비워 둔다.
						<section aria-hidden style={{ height: `${tabHeight}%` }} />
					)}
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
