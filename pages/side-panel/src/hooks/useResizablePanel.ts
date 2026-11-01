import {
	ChromeSyncStorage,
	STORAGE_KEYS,
} from "@web-memo/shared/modules/chrome-storage";
import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_CHAT_HEIGHT = 60;
const DEFAULT_SUMMARY_HEIGHT = 40;
const MAX_CHAT_HEIGHT = 80;
const MAX_SUMMARY_HEIGHT = 60;
const MIN_MEMO_HEIGHT_PX = 128;

export function clampPanelHeight(
	height: number,
	containerHeight: number,
	isSummaryActive: boolean,
) {
	if (!isSummaryActive) return Math.min(MAX_CHAT_HEIGHT, Math.max(0, height));
	const maxByMemo =
		containerHeight > 0
			? ((containerHeight - MIN_MEMO_HEIGHT_PX) / containerHeight) * 100
			: DEFAULT_SUMMARY_HEIGHT;
	return Math.min(
		MAX_SUMMARY_HEIGHT,
		Math.max(0, maxByMemo),
		Math.max(0, height),
	);
}

export default function useResizablePanel(isSummaryActive: boolean) {
	const [chatHeight, setChatHeight] = useState(DEFAULT_CHAT_HEIGHT);
	const [summaryHeight, setSummaryHeight] = useState(DEFAULT_SUMMARY_HEIGHT);
	const [containerHeight, setContainerHeight] = useState(0);
	const [isResizing, setIsResizing] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const startYRef = useRef(0);
	const startHeightRef = useRef(0);
	const tabHeight = clampPanelHeight(
		isSummaryActive ? summaryHeight : chatHeight,
		containerHeight,
		isSummaryActive,
	);

	useEffect(() => {
		let isCurrent = true;
		void ChromeSyncStorage.get<number>(STORAGE_KEYS.tabHeight).then(
			(savedHeight) => {
				if (isCurrent && savedHeight) setChatHeight(savedHeight);
			},
		);
		return () => {
			isCurrent = false;
		};
	}, []);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;
		const observer = new ResizeObserver(() => {
			setContainerHeight(container.getBoundingClientRect().height);
		});
		observer.observe(container);
		setContainerHeight(container.getBoundingClientRect().height);
		return () => observer.disconnect();
	}, []);

	const handleMouseDown = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			startYRef.current = e.clientY;
			startHeightRef.current = tabHeight;
			setIsResizing(true);
		},
		[tabHeight],
	);

	useEffect(() => {
		if (!isResizing) return;
		const handleMouseMove = (e: MouseEvent) => {
			const height = containerRef.current?.getBoundingClientRect().height ?? 0;
			if (!height) return;
			const nextHeight =
				startHeightRef.current +
				((e.clientY - startYRef.current) / height) * 100;
			const clamped = clampPanelHeight(nextHeight, height, isSummaryActive);
			if (isSummaryActive) setSummaryHeight(clamped);
			else setChatHeight(clamped);
		};
		const handleMouseUp = () => {
			setIsResizing(false);
			if (!isSummaryActive)
				void ChromeSyncStorage.set(STORAGE_KEYS.tabHeight, chatHeight);
		};
		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);
		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
		};
	}, [isResizing, isSummaryActive, chatHeight]);

	return {
		tabHeight,
		memoHeight: 100 - tabHeight,
		isResizing,
		containerRef,
		handleMouseDown,
	};
}
