import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import {
	cn,
	formatPlanDateShort,
	getPlanDateLabelKind,
	type TPlanDateKey,
	toPlanDateKey,
} from "@web-memo/shared/utils";
import type { MouseEvent } from "react";

/** 읽을 계획 날짜를 "<짧은 라벨> 볼 예정"으로 보여주는 칩. 누르면 날짜 선택 팝오버가 열린다. */
export default function PlanDateChip({
	lng,
	plannedDate,
	onClick,
}: IFPlanDateChipProps) {
	const { t } = useTranslation(lng);
	const labelKind = getPlanDateLabelKind(
		plannedDate,
		toPlanDateKey(new Date()),
	);
	const label = {
		today: t("memos.plan.label.today"),
		tomorrow: t("memos.plan.label.tomorrow"),
		date: formatPlanDateShort(plannedDate, lng),
	}[labelKind];

	const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
		event.stopPropagation();
		onClick();
	};

	return (
		<button
			type="button"
			data-testid="plan-date-chip"
			onClick={handleClick}
			className={cn(
				"w-fit rounded text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
				labelKind === "date"
					? "text-muted-foreground"
					: "font-semibold text-primary",
			)}
		>
			{t("memos.plan.chip", {
				label,
				interpolation: { escapeValue: false },
			})}
		</button>
	);
}

interface IFPlanDateChipProps extends LanguageType {
	plannedDate: TPlanDateKey;
	onClick: () => void;
}
