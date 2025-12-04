import {
	ChromeSyncStorage,
	STORAGE_KEYS,
} from "@web-memo/shared/modules/chrome-storage";
import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_TAB_HEIGHT = 50;
const MIN_TAB_HEIGHT = 5;
const MAX_TAB_HEIGHT = 80;

export default function useResizablePanel() {
	const [tabHeight, setTabHeight] = useState(DEFAULT_TAB_HEIGHT);
	const [isResizing, setIsResizing] = useState(false);
	const containerRef = useRef<HTMLElement>(null);

	useEffect(() => {
		ChromeSyncStorage.get<number>(STORAGE_KEYS.tabHeight).then(
			(savedHeight) => {
				if (savedHeight !== undefined && savedHeight !== null) {
					setTabHeight(savedHeight);
				}
			},
		);
	}, []);

	const handleMouseDown = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		setIsResizing(true);
	}, []);

	const handleMouseMove = useCallback(
		(e: MouseEvent) => {
			if (!isResizing || !containerRef.current) return;

			const container = containerRef.current;
			const containerRect = container.getBoundingClientRect();
			const newHeight =
				((e.clientY - containerRect.top) / containerRect.height) * 100;

			const clampedHeight = Math.min(
				MAX_TAB_HEIGHT,
				Math.max(MIN_TAB_HEIGHT, newHeight),
			);
			setTabHeight(clampedHeight);
		},
		[isResizing],
	);

	const handleMouseUp = useCallback(() => {
		if (isResizing) {
			setIsResizing(false);
			ChromeSyncStorage.set(STORAGE_KEYS.tabHeight, tabHeight);
		}
	}, [isResizing, tabHeight]);

	useEffect(() => {
		if (isResizing) {
			document.addEventListener("mousemove", handleMouseMove);
			document.addEventListener("mouseup", handleMouseUp);
		}

		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
		};
	}, [isResizing, handleMouseMove, handleMouseUp]);

	return {
		tabHeight,
		memoHeight: 100 - tabHeight,
		isResizing,
		containerRef,
		handleMouseDown,
	};
}
