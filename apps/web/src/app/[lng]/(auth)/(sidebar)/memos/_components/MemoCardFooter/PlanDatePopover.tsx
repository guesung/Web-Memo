import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import type { GetMemoResponse } from "@web-memo/shared/types";
import { cn, type TPlanDateKey } from "@web-memo/shared/utils";
import {
	Button,
	PlanDatePicker,
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@web-memo/ui";
import { CalendarClock } from "lucide-react";
import type { MouseEvent } from "react";

/** 카드의 달력 버튼과 읽을 계획 날짜 선택 팝오버. 열림 상태는 칩과 함께 쓰므로 호출부가 쥔다. */
export default function PlanDatePopover({
	memo,
	lng,
	open,
	onOpenChange,
	onSelect,
}: IFPlanDatePopoverProps) {
	const { t } = useTranslation(lng);
	const stopPropagation = (event: MouseEvent) => event.stopPropagation();

	return (
		<Popover open={open} onOpenChange={onOpenChange}>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="w-8 h-8 p-0 hover:bg-primary/10 rounded-full"
					aria-label={t("memos.toggle.plan")}
					title={t("memos.toggle.plan")}
					onClick={stopPropagation}
				>
					<CalendarClock
						size={16}
						className={cn(
							"transition-all",
							memo.plannedDate ? "text-primary" : "text-muted-foreground",
							"hover:scale-125",
						)}
					/>
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="max-h-[var(--radix-popover-content-available-height)] w-auto overflow-y-auto p-3"
				onClick={stopPropagation}
				onKeyDown={(event) => event.stopPropagation()}
			>
				<PlanDatePicker
					value={memo.plannedDate}
					locale={lng}
					labels={{
						title: t("memos.plan.picker.title"),
						today: t("memos.plan.picker.today"),
						tomorrow: t("memos.plan.picker.tomorrow"),
						weekend: t("memos.plan.picker.weekend"),
						nextMonday: t("memos.plan.picker.nextMonday"),
						clear: t("memos.plan.picker.clear"),
					}}
					onSelect={onSelect}
				/>
			</PopoverContent>
		</Popover>
	);
}

interface IFPlanDatePopoverProps extends LanguageType {
	memo: GetMemoResponse;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSelect: (plannedDate: TPlanDateKey | null) => void;
}
