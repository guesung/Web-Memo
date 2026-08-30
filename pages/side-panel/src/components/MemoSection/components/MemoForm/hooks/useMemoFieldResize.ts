import {
	ChromeSyncStorage,
	STORAGE_KEYS,
} from "@web-memo/shared/modules/chrome-storage";
import { useEffect, useRef, useState } from "react";

/**
 * 메모 폼 안에서 높이를 따로 가지는 세로 영역.
 */
export type TMemoFieldKey = "memo" | "impression" | "actionItem";

/**
 * 영역별 flex-grow 비중. 합이 얼마인지는 상관없고 서로의 비율만 의미가 있다.
 */
export type TMemoFieldRatios = Record<TMemoFieldKey, number>;

const DEFAULT_MEMO_FIELD_RATIOS: TMemoFieldRatios = {
	memo: 50,
	impression: 25,
	actionItem: 25,
};
const MIN_MEMO_FIELD_RATIO = 8;

interface UseMemoFieldResizeProps {
	visibleFieldKeys: TMemoFieldKey[];
}

/**
 * 메모 폼의 세 영역이 높이를 나눠 갖게 하고, 사이의 핸들로 그 비율을 조절한다.
 * @description 핸들은 맞닿은 두 영역만 비중을 주고받게 해서, 하나를 늘리면 바로 위나 아래가 줄어든다.
 * 조절값은 마우스를 뗄 때 크롬 동기화 저장소에 남아 사이드패널을 다시 열어도 유지된다.
 * 꺼져 있는 영역은 `visibleFieldKeys`에서 빠지므로 그 비중은 남은 영역이 자연히 나눠 갖는다.
 */
export default function useMemoFieldResize({
	visibleFieldKeys,
}: UseMemoFieldResizeProps) {
	const [fieldRatios, setFieldRatios] = useState(DEFAULT_MEMO_FIELD_RATIOS);
	const [resizingFieldKey, setResizingFieldKey] =
		useState<TMemoFieldKey | null>(null);
	const fieldRatiosRef = useRef(DEFAULT_MEMO_FIELD_RATIOS);
	const dragStartRef = useRef({
		clientY: 0,
		upperFieldKey: "memo" as TMemoFieldKey,
		upperRatio: 0,
		pairRatio: 0,
		ratioPerPixel: 0,
	});

	useEffect(function initFieldRatios() {
		(async () => {
			const storedFieldRatios = await ChromeSyncStorage.get<TMemoFieldRatios>(
				STORAGE_KEYS.memoFieldRatios,
			);

			if (!storedFieldRatios) {
				return;
			}

			fieldRatiosRef.current = storedFieldRatios;
			setFieldRatios(storedFieldRatios);
		})();
	}, []);

	useEffect(
		function attachFieldResizeListeners() {
			if (!resizingFieldKey) {
				return;
			}

			const handleMouseMove = (event: MouseEvent) => {
				const dragStart = dragStartRef.current;
				const movedRatio =
					(event.clientY - dragStart.clientY) * dragStart.ratioPerPixel;
				const nextUpperRatio = Math.min(
					dragStart.pairRatio - MIN_MEMO_FIELD_RATIO,
					Math.max(MIN_MEMO_FIELD_RATIO, dragStart.upperRatio + movedRatio),
				);

				const nextFieldRatios = { ...fieldRatiosRef.current };
				nextFieldRatios[dragStart.upperFieldKey] = nextUpperRatio;
				nextFieldRatios[resizingFieldKey] = dragStart.pairRatio - nextUpperRatio;

				fieldRatiosRef.current = nextFieldRatios;
				setFieldRatios(nextFieldRatios);
			};

			const handleMouseUp = () => {
				ChromeSyncStorage.set(
					STORAGE_KEYS.memoFieldRatios,
					fieldRatiosRef.current,
				);
				setResizingFieldKey(null);
			};

			document.addEventListener("mousemove", handleMouseMove);
			document.addEventListener("mouseup", handleMouseUp);

			return () => {
				document.removeEventListener("mousemove", handleMouseMove);
				document.removeEventListener("mouseup", handleMouseUp);
			};
		},
		[resizingFieldKey],
	);

	const handleResizeStart = (
		event: React.MouseEvent<HTMLDivElement>,
		lowerFieldKey: TMemoFieldKey,
	) => {
		const upperFieldKey =
			visibleFieldKeys[visibleFieldKeys.indexOf(lowerFieldKey) - 1];
		const upperElement = event.currentTarget.previousElementSibling;
		const lowerElement = event.currentTarget.nextElementSibling;

		if (!upperFieldKey || !upperElement || !lowerElement) {
			return;
		}

		event.preventDefault();

		const upperRatio = fieldRatiosRef.current[upperFieldKey];
		const pairRatio = upperRatio + fieldRatiosRef.current[lowerFieldKey];
		const pairHeight =
			upperElement.getBoundingClientRect().height +
			lowerElement.getBoundingClientRect().height;

		dragStartRef.current = {
			clientY: event.clientY,
			upperFieldKey,
			upperRatio,
			pairRatio,
			ratioPerPixel: pairRatio / pairHeight,
		};
		setResizingFieldKey(lowerFieldKey);
	};

	return { fieldRatios, resizingFieldKey, handleResizeStart };
}
