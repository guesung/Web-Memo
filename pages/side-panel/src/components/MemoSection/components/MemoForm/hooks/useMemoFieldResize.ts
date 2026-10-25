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

/** 조절 전 기본값은 메모가 대부분을 차지하던 기존 화면에 가깝게 잡는다. */
const DEFAULT_MEMO_FIELD_RATIOS: TMemoFieldRatios = {
	memo: 60,
	impression: 20,
	actionItem: 20,
};
/** 드래그로 줄일 수 있는 영역의 최소 비중. */
const MIN_MEMO_FIELD_RATIO = 8;

/**
 * 지금 화면에 떠 있는 영역만 위에서 아래 순서로 담는다. 꺼진 영역은 빼고 넘긴다.
 */
interface IFUseMemoFieldResizeProps {
	visibleFieldKeys: TMemoFieldKey[];
	fieldResizeState: ReturnType<typeof useMemoFieldRatios>;
}

/**
 * 메모 폼의 세 영역이 높이를 나눠 갖게 하고, 사이의 핸들로 그 비율을 조절한다.
 * @description 핸들은 맞닿은 두 영역만 비중을 주고받게 해서, 하나를 늘리면 바로 위나 아래가 줄어든다.
 * 조절값은 마우스를 뗄 때 크롬 동기화 저장소에 남아 사이드패널을 다시 열어도 유지된다.
 * 꺼져 있는 영역은 `visibleFieldKeys`에서 빠지므로 그 비중은 남은 영역이 자연히 나눠 갖는다.
 */
const useMemoFieldResize = ({
	visibleFieldKeys,
	fieldResizeState,
}: IFUseMemoFieldResizeProps) => {
	const { fieldRatios, setFieldRatios } = fieldResizeState;
	const [resizingFieldKey, setResizingFieldKey] =
		useState<TMemoFieldKey | null>(null);
	const fieldRatiosRef = useRef(fieldRatios);
	fieldRatiosRef.current = fieldRatios;
	const dragStartRef = useRef({
		clientY: 0,
		upperFieldKey: "memo" as TMemoFieldKey,
		upperRatio: 0,
		pairRatio: 0,
		ratioPerPixel: 0,
	});

	useEffect(() => {
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
	}, [resizingFieldKey, setFieldRatios]);

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
};

export default useMemoFieldResize;

/** 페이지별 폼이 다시 마운트돼도 유지할 입력 영역 비율을 한 번 복원한다. */
export const useMemoFieldRatios = () => {
	const [fieldRatios, setFieldRatios] = useState(DEFAULT_MEMO_FIELD_RATIOS);

	useEffect(() => {
		let isMounted = true;
		const restoreFieldRatios = async () => {
			const storedFieldRatios = await ChromeSyncStorage.get<TMemoFieldRatios>(
				STORAGE_KEYS.memoFieldRatios,
			);

			if (isMounted && storedFieldRatios) {
				setFieldRatios(storedFieldRatios);
			}
		};

		void restoreFieldRatios();

		return () => {
			isMounted = false;
		};
	}, []);

	return { fieldRatios, setFieldRatios };
};
