import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { cn } from "@web-memo/ui";
import type { GaTrendBadgeKind } from "../_types";

const BADGE_STYLES: Record<GaTrendBadgeKind, string> = {
	surge: "bg-chart-3/15 text-chart-3",
	zero: "bg-destructive/10 text-destructive",
};

/** 어제 값이 평소와 크게 다를 때 붙는 작은 배지. */
export default function GaTrendBadge({
	lng,
	kind,
	className,
}: GaTrendBadgeProps) {
	const { t } = useTranslation(lng);

	return (
		<span
			className={cn(
				"rounded-full px-2 py-0.5 text-xs font-semibold",
				BADGE_STYLES[kind],
				className,
			)}
		>
			{t(`admin.gaMetrics.badge.${kind}`)}
		</span>
	);
}

interface GaTrendBadgeProps extends LanguageType {
	kind: GaTrendBadgeKind;
	className?: string;
}
