import {
	formatPlanDateShort,
	getPlanQuickPicks,
	type IPlanQuickPicks,
	parsePlanDateKey,
	type TPlanDateKey,
	toPlanDateKey,
} from "@web-memo/shared/utils";
import { enUS, ko } from "date-fns/locale";

import { cn } from "../utils";
import { Button } from "./button";
import { Calendar } from "./calendar";

type TQuickPickKind = keyof IPlanQuickPicks;

const QUICK_PICK_ORDER: TQuickPickKind[] = [
	"today",
	"tomorrow",
	"weekend",
	"nextMonday",
];

export interface IPlanDatePickerLabels {
	title: string;
	today: string;
	tomorrow: string;
	weekend: string;
	nextMonday: string;
	clear: string;
}

export interface PlanDatePickerProps {
	value: TPlanDateKey | null;
	locale: string;
	labels: IPlanDatePickerLabels;
	onSelect: (key: TPlanDateKey | null) => void;
	/** 테스트에서 오늘을 고정할 때만 넘긴다 */
	now?: Date;
	className?: string;
}

/**
 * "읽을 계획" 날짜 팝오버의 본문. 확장 사이드 패널과 웹 카드가 같은 빠른 선택 날짜를 내도록 한곳에 둔다.
 * @description 저장은 하지 않고 `onSelect`로 날짜 키(해제면 `null`)만 넘긴다. 문구는 진입점마다 i18n 방식이 달라 props로 받는다.
 */
export function PlanDatePicker({
	value,
	locale,
	labels,
	onSelect,
	now = new Date(),
	className,
}: PlanDatePickerProps) {
	const quickPicks = getPlanQuickPicks(now);
	const today = parsePlanDateKey(quickPicks.today);
	const selected = value ? parsePlanDateKey(value) : undefined;

	return (
		<div
			className={cn("flex flex-col gap-3", className)}
			data-testid="plan-date-picker"
		>
			<p className="text-sm font-semibold">{labels.title}</p>
			<div className="grid grid-cols-2 gap-2">
				{QUICK_PICK_ORDER.map((kind) => {
					const key = quickPicks[kind];
					return (
						<Button
							key={kind}
							type="button"
							variant={key === value ? "secondary" : "outline"}
							size="sm"
							className="h-auto flex-col items-start gap-0 py-1.5"
							data-testid={`plan-quick-${kind}`}
							onClick={() => onSelect(key)}
						>
							<span className="text-sm font-medium">{labels[kind]}</span>
							<span className="text-muted-foreground text-xs tabular-nums">
								{formatPlanDateShort(key, locale)}
							</span>
						</Button>
					);
				})}
			</div>
			<Calendar
				mode="single"
				className="border-t p-0 pt-3"
				locale={locale === "ko" ? ko : enUS}
				weekStartsOn={0}
				selected={selected}
				defaultMonth={selected ?? today}
				today={today}
				disabled={{ before: today }}
				onSelect={(date) => {
					// 이미 선택된 날을 다시 누르면 react-day-picker가 undefined를 준다. 해제는 전용 버튼으로만 한다.
					if (date) onSelect(toPlanDateKey(date));
				}}
			/>
			{value && (
				<div className="border-t pt-2">
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="text-muted-foreground"
						data-testid="plan-date-clear"
						onClick={() => onSelect(null)}
					>
						{labels.clear}
					</Button>
				</div>
			)}
		</div>
	);
}
