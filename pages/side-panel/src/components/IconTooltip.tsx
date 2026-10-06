import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@web-memo/ui";

const TOOLTIP_DELAY_MS = 200;

interface IFIconTooltipProps {
	/** 말풍선에 보여 줄 문구. 비어 있으면 말풍선 없이 children만 그린다 */
	label?: string;
	/** 말풍선이 붙는 아이콘 버튼. 비활성 버튼도 hover를 받도록 span으로 감싼다 */
	children: React.ReactNode;
}

/** 아이콘 전용 컨트롤에 hover·포커스 시 의미를 알려 주는 말풍선을 붙인다. */
export default function IconTooltip({ label, children }: IFIconTooltipProps) {
	if (!label) {
		return children;
	}

	return (
		<TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
			<Tooltip>
				<TooltipTrigger asChild>
					<span className="inline-flex">{children}</span>
				</TooltipTrigger>
				<TooltipContent side="top">{label}</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
