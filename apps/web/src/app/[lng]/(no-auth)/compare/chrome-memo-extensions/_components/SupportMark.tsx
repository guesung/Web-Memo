import { cn } from "@web-memo/shared/utils";
import { Check, CircleHelp, type LucideIcon, Minus, X } from "lucide-react";
import type { TSupportStatus } from "../_types";

/**
 * 지원 정도를 아이콘과 문구로 나타낸다. 표 셀과 범례가 같이 쓴다.
 * @description
 * 색으로 우열을 드러내지 않도록 foreground·muted-foreground 두 가지만 쓴다.
 * `description`이 있으면 상태 이름은 화면 읽기 도구에만 읽히고 설명이 보인다.
 */
const SupportMark = ({
	status,
	description,
	className,
}: IFSupportMarkProps) => {
	const { icon: StatusIcon, label, iconClassName } = SUPPORT_MARK[status];

	return (
		<span className={cn("inline-flex items-start gap-1.5", className)}>
			<StatusIcon
				aria-hidden="true"
				className={cn("mt-0.5 h-4 w-4 flex-shrink-0", iconClassName)}
			/>
			{description ? (
				<span>
					<span className="sr-only">{label}: </span>
					{description}
				</span>
			) : (
				<span>{label}</span>
			)}
		</span>
	);
};

export default SupportMark;

const SUPPORT_MARK: Record<
	TSupportStatus,
	{ icon: LucideIcon; label: string; iconClassName: string }
> = {
	supported: { icon: Check, label: "지원", iconClassName: "text-foreground" },
	partial: { icon: Minus, label: "일부", iconClassName: "text-foreground" },
	unsupported: {
		icon: X,
		label: "없음",
		iconClassName: "text-muted-foreground",
	},
	unknown: {
		icon: CircleHelp,
		label: "확인 못 함",
		iconClassName: "text-muted-foreground",
	},
};

/** SupportMark의 입력 */
interface IFSupportMarkProps {
	status: TSupportStatus;
	/** 셀에 보일 짧은 설명. 없으면 상태 이름을 보인다(범례) */
	description?: string;
	className?: string;
}
