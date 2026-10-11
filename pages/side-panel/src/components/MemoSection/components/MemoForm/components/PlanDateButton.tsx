import IconTooltip from "@src/components/IconTooltip";
import {
	formatPlanDateShort,
	getPlanDateLabelKind,
	parsePlanDateKey,
	toPlanDateKey,
} from "@web-memo/shared/utils";
import { I18n } from "@web-memo/shared/utils/extension";
import {
	cn,
	PlanDatePicker,
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@web-memo/ui";
import { CalendarClockIcon } from "lucide-react";
import { useState } from "react";

/** 읽을 계획 날짜 버튼과 날짜 선택 팝오버. 날짜를 고르거나 해제하면 팝오버를 닫고 `onSelect`로 넘긴다. */
export default function PlanDateButton({
	plannedDate,
	isDisabled,
	isDimmed,
	disabledReason,
	onSelect,
}: IFPlanDateButtonProps) {
	const [isOpen, setIsOpen] = useState(false);
	const locale = I18n.getUILanguage();
	const todayKey = toPlanDateKey(new Date());
	const labelKind = plannedDate
		? getPlanDateLabelKind(plannedDate, todayKey)
		: undefined;
	const label =
		plannedDate && labelKind
			? {
					today: I18n.get("plan_label_today"),
					tomorrow: I18n.get("plan_label_tomorrow"),
					date: formatPlanDateShort(plannedDate, locale),
				}[labelKind]
			: undefined;
	// 지난 날짜는 빨강 없이 muted로 둔다. 오늘·내일·앞으로의 날짜만 primary로 강조한다.
	const isPast = !!plannedDate && plannedDate < todayKey;
	const tooltipLabel = plannedDate
		? I18n.get(
				"tooltip_plan_change",
				new Intl.DateTimeFormat(locale, {
					month: "long",
					day: "numeric",
					weekday: "long",
				}).format(parsePlanDateKey(plannedDate)),
			)
		: I18n.get("tooltip_plan_add");

	const handleSelect = (key: string | null) => {
		setIsOpen(false);
		onSelect(key);
	};

	return (
		<Popover open={isOpen && !isDisabled} onOpenChange={setIsOpen}>
			<IconTooltip label={disabledReason ?? tooltipLabel}>
				<PopoverTrigger asChild>
					<button
						type="button"
						data-testid="plan-date-button"
						aria-label={I18n.get("plan_date_button")}
						disabled={isDisabled}
						className={cn(
							"focus-visible:ring-ring flex items-center gap-1 rounded-sm text-muted-foreground transition-transform focus-visible:outline-none focus-visible:ring-1",
							isDisabled &&
								(disabledReason ? "cursor-not-allowed" : "cursor-default"),
							!isDisabled && "hover:scale-105 active:scale-95",
							isDimmed && "opacity-50",
							label && !isPast && "bg-primary/10 px-1.5 py-0.5 text-primary",
							label && isPast && "bg-muted px-1.5 py-0.5",
						)}
					>
						<CalendarClockIcon size={16} />
						{label && (
							<span
								data-testid="plan-date-label"
								className="whitespace-nowrap text-xs font-medium"
							>
								{label}
							</span>
						)}
					</button>
				</PopoverTrigger>
			</IconTooltip>
			<PopoverContent align="start" className="w-auto p-3">
				<PlanDatePicker
					value={plannedDate}
					locale={locale}
					labels={{
						title: I18n.get("plan_picker_title"),
						today: I18n.get("plan_picker_today"),
						tomorrow: I18n.get("plan_picker_tomorrow"),
						weekend: I18n.get("plan_picker_weekend"),
						nextMonday: I18n.get("plan_picker_next_monday"),
						clear: I18n.get("plan_picker_clear"),
					}}
					onSelect={handleSelect}
				/>
			</PopoverContent>
		</Popover>
	);
}

interface IFPlanDateButtonProps {
	/** 지정된 읽을 계획 날짜 키. 없으면 null */
	plannedDate: string | null;
	/** 메모 조회 잠금·오프라인·동기화 중이라 팝오버를 열 수 없는지 */
	isDisabled: boolean;
	isDimmed: boolean;
	/** 막힌 사유(오프라인·동기화 중). 있으면 말풍선에 동작 문구 대신 보여 준다 */
	disabledReason?: string;
	/** 날짜 키를 고르면 그 키, 해제하면 null */
	onSelect: (plannedDate: string | null) => void;
}
