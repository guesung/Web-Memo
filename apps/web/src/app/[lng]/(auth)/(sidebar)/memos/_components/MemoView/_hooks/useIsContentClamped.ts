import { useEffect, useRef, useState } from "react";

/**
 * 카드 안의 말줄임 대상(`data-clamp`) 중 하나라도 내용이 잘렸는지 잰다.
 * @description line-clamp는 CSS라 잘렸는지를 알려주지 않는다. 짧은 메모에 펼치기
 * 버튼이 뜨지 않도록 실제 높이를 비교한다.
 */
const useIsContentClamped = (isClampEnabled: boolean) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const [isContentClamped, setIsContentClamped] = useState(false);

	useEffect(() => {
		const container = containerRef.current;
		if (!isClampEnabled || !container) {
			setIsContentClamped(false);
			return;
		}

		const measureClamp = () => {
			const clampTargets =
				container.querySelectorAll<HTMLElement>("[data-clamp]");
			setIsContentClamped(
				Array.from(clampTargets).some(
					(clampTarget) => clampTarget.scrollHeight > clampTarget.clientHeight,
				),
			);
		};

		measureClamp();
		const resizeObserver = new ResizeObserver(measureClamp);
		resizeObserver.observe(container);

		return () => resizeObserver.disconnect();
	}, [isClampEnabled]);

	return { containerRef, isContentClamped };
};

export default useIsContentClamped;
