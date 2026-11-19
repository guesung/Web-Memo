import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { cn } from "@web-memo/ui";
import { GA_CORE_METRICS, GA_FETCH_DAYS } from "../_constants";
import {
	buildSeries,
	formatAverage,
	formatDelta,
	type GaMetricsIndex,
	getDeltaToneClass,
	summarizeSeries,
} from "../_utils";
import GaSparkline from "./GaSparkline";
import GaTrendBadge from "./GaTrendBadge";

/** 매일 보는 지표 12종. 카드를 누르면 위 그래프가 그 지표로 바뀐다. */
export default function GaMetricCards({
	lng,
	index,
	days,
	selectedMetric,
	onMetricSelect,
}: GaMetricCardsProps) {
	const { t } = useTranslation(lng);

	return (
		<section className="flex flex-col gap-3">
			<h3 className="text-base font-semibold">
				{t("admin.gaMetrics.cards_title")}
			</h3>
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{GA_CORE_METRICS.map(({ key, labelKey }) => {
					const fullSeries = buildSeries({
						index,
						metric: key,
						unit: "users",
						days: GA_FETCH_DAYS,
					});
					const summary = summarizeSeries(fullSeries);
					const selected = selectedMetric === key;

					return (
						<button
							key={key}
							type="button"
							aria-pressed={selected}
							onClick={() => onMetricSelect(key)}
							className={cn(
								"flex flex-col items-start gap-1.5 rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
								selected && "border-primary ring-1 ring-primary",
							)}
						>
							<span className="flex w-full items-center justify-between gap-2">
								<span className="text-sm font-semibold">{t(labelKey)}</span>
								{summary.badge ? (
									<GaTrendBadge lng={lng} kind={summary.badge} />
								) : null}
							</span>
							<span className="flex items-baseline gap-2">
								<span className="text-2xl font-bold">{summary.yesterday}</span>
								<span
									className={cn(
										"text-xs",
										getDeltaToneClass(summary.deltaPercent),
									)}
								>
									{formatDelta(summary.deltaPercent)}
								</span>
							</span>
							<GaSparkline
								series={fullSeries.slice(-days)}
								selected={selected}
							/>
							<span className="text-xs text-muted-foreground">
								{t("admin.gaMetrics.card_footer", {
									average: formatAverage(summary.average),
								})}
							</span>
						</button>
					);
				})}
			</div>
		</section>
	);
}

interface GaMetricCardsProps extends LanguageType {
	index: GaMetricsIndex;
	/** 스파크라인에 그릴 최근 일수 */
	days: number;
	selectedMetric: string;
	onMetricSelect: (metric: string) => void;
}
