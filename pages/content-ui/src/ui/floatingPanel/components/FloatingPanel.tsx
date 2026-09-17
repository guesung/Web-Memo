import { X } from "lucide-react";

/** FloatingPanel에 전달하는 인자 */
interface IFFloatingPanelProps {
	/** 헤더의 닫기 버튼을 눌렀을 때 호출된다 */
	onCloseButtonClick: () => void;
}

/**
 * 사이드 패널을 열 수 없는 브라우저에서 페이지 오른쪽에 띄우는 대체 패널.
 * @description 기존 side-panel 앱을 iframe으로 그대로 불러온다. iframe은 확장 오리진이라
 * chrome.storage·Supabase 세션이 그대로 동작하고 페이지 CSS와도 격리된다.
 * 색상은 인라인 스타일로 둔다 — content-ui의 shadow root에는 `packages/ui/global.css`의
 * 토큰 CSS 변수가 정의돼 있지 않아 `bg-background` 같은 역할 클래스가 비어버린다
 * (`HighlightTooltip`과 같은 방식).
 */
const FloatingPanel = ({ onCloseButtonClick }: IFFloatingPanelProps) => {
	return (
		<div
			className="fixed right-0 top-0 flex h-screen w-[400px] max-w-[100vw] flex-col"
			style={{
				zIndex: 2147483647,
				background: "#ffffff",
				borderLeft: "1px solid rgba(0, 0, 0, 0.1)",
				boxShadow: "-4px 0 16px rgba(0, 0, 0, 0.15)",
			}}
		>
			<div
				className="flex h-9 shrink-0 items-center justify-between px-3"
				style={{
					borderBottom: "1px solid rgba(0, 0, 0, 0.1)",
					color: "#171717",
				}}
			>
				<span className="text-sm font-medium">Web Memo</span>
				<button
					id="WEB_MEMO_FLOATING_PANEL_CLOSE_BUTTON"
					type="button"
					aria-label="Close Web Memo panel"
					className="flex h-7 w-7 items-center justify-center rounded-md"
					onClick={onCloseButtonClick}
				>
					<X size={16} />
				</button>
			</div>
			<iframe
				id="WEB_MEMO_FLOATING_PANEL_IFRAME"
				title="Web Memo"
				src={chrome.runtime.getURL("side-panel/index.html")}
				className="w-full flex-1 border-0"
			/>
		</div>
	);
};

export default FloatingPanel;
