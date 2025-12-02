import {
	ChromeSyncStorage,
	STORAGE_KEYS,
} from "@web-memo/shared/modules/chrome-storage";
import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_SUMMARY_HEIGHT = 50;
const MIN_SUMMARY_HEIGHT = 20;
const MAX_SUMMARY_HEIGHT = 80;

export default function useResizablePanel() {
	const [summaryHeight, setSummaryHeight] = useState(DEFAULT_SUMMARY_HEIGHT);
	const [isResizing, setIsResizing] = useState(false);
	const containerRef = useRef<HTMLElement>(null);

	useEffect(() => {
		ChromeSyncStorage.get<number>(STORAGE_KEYS.summaryHeight).then(
			(savedHeight) => {
				if (savedHeight !== undefined && savedHeight !== null) {
					setSummaryHeight(savedHeight);
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
				MAX_SUMMARY_HEIGHT,
				Math.max(MIN_SUMMARY_HEIGHT, newHeight),
			);
			setSummaryHeight(clampedHeight);
		},
		[isResizing],
	);

	const handleMouseUp = useCallback(() => {
		if (isResizing) {
			setIsResizing(false);
			ChromeSyncStorage.set(STORAGE_KEYS.summaryHeight, summaryHeight);
		}
	}, [isResizing, summaryHeight]);

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
		summaryHeight,
		memoHeight: 100 - summaryHeight,
		isResizing,
		containerRef,
		handleMouseDown,
	};
}
