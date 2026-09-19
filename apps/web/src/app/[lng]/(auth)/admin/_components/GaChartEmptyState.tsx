"use client";

import { Button } from "@web-memo/ui";
import type { LucideIcon } from "lucide-react";

/**
 * 차트 자리에만 들어가는 안내.
 *
 * @description 미연결과 조회 실패를 같은 틀로 그리되 아이콘·문구·버튼으로 갈라
 * 놓습니다. 두 상태가 같은 화면으로 떨어지면 크리덴셜을 넣은 뒤에도 똑같은 안내를
 * 보며 설정을 의심하게 됩니다. 높이를 차트와 같은 `h-[300px]`로 고정하는 것은
 * 연결 여부에 따라 페이지가 출렁이지 않게 하기 위해서입니다.
 */
export default function GaChartEmptyState({
	icon: Icon,
	title,
	description,
	retryLabel,
	onRetryClick,
}: GaChartEmptyStateProps) {
	return (
		<div className="flex h-[300px] w-full flex-col items-center justify-center gap-2 text-center">
			<Icon className="h-8 w-8 text-muted-foreground" />
			<p className="text-sm font-medium">{title}</p>
			<p className="text-sm text-muted-foreground">{description}</p>
			{onRetryClick && retryLabel ? (
				<Button
					variant="outline"
					size="sm"
					className="mt-2"
					onClick={onRetryClick}
				>
					{retryLabel}
				</Button>
			) : null}
		</div>
	);
}

/** 차트 자리 안내의 props. */
interface GaChartEmptyStateProps {
	/** 상태를 요약하는 lucide 아이콘 */
	icon: LucideIcon;
	/** 무슨 일이 일어났는지 알리는 한 줄 */
	title: string;
	/** 사용자가 무엇을 할 수 있는지(또는 하지 않아도 되는지) 알리는 보조 한 줄 */
	description: string;
	/** 다시 시도 버튼의 문구. `onRetryClick`과 함께 넘어올 때만 그립니다 */
	retryLabel?: string;
	/** 다시 눌러 볼 여지가 실제로 있는 상태에서만 넘깁니다 */
	onRetryClick?: () => void;
}
