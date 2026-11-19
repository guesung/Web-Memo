"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { useAdminGaDailyMetricsQuery } from "@web-memo/shared/hooks";
import {
	Label,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@web-memo/ui";
import { ChartNoAxesColumn, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import {
	GA_ACTIVE_USERS_METRIC,
	GA_FETCH_DAYS,
	GA_PERIOD_OPTIONS,
} from "../_constants";
import type { GaMetricUnit } from "../_types";
import { formatShortDate, indexGaMetrics } from "../_utils";
import GaChartEmptyState from "./GaChartEmptyState";
import GaEventTable from "./GaEventTable";
import GaMainChart from "./GaMainChart";
import GaMetricCards from "./GaMetricCards";
import GaMetricsSkeleton from "./GaMetricsSkeleton";

const DEFAULT_PERIOD_DAYS = 30;

/**
 * GA 일별 지표 스냅샷 섹션.
 *
 * @description 90일치를 한 번만 받아 기간(7/30/90일)은 화면에서 자른다. 기준일은 오늘이 아니라
 * 적재된 가장 최근 날짜라서, 예약 실행이 빠진 날은 데이터가 없는 칸으로 남는다.
 */
export default function GaMetricsSection({ lng }: GaMetricsSectionProps) {
	const { t } = useTranslation(lng);
	const [days, setDays] = useState<number>(DEFAULT_PERIOD_DAYS);
	const [metric, setMetric] = useState(GA_ACTIVE_USERS_METRIC);
	const [unit, setUnit] = useState<GaMetricUnit>("users");
	const { data, isPending, isError, refetch } = useAdminGaDailyMetricsQuery({
		days: GA_FETCH_DAYS,
	});
	const index = useMemo(() => (data ? indexGaMetrics(data) : null), [data]);

	const handleDaysChange = (value: string) => {
		setDays(Number(value));
	};
	const handleRetryClick = () => {
		refetch();
	};

	return (
		<section className="flex flex-col gap-6">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div className="flex flex-col gap-1.5">
					<h2 className="text-xl font-bold">{t("admin.gaMetrics.title")}</h2>
					<p className="text-sm text-muted-foreground">
						{index
							? t("admin.gaMetrics.subtitle", {
									date: formatShortDate(index.baseDate),
								})
							: t("admin.gaMetrics.subtitle_empty")}
					</p>
				</div>
				{index ? (
					<div className="flex items-center gap-2">
						<Label htmlFor="ga-period" className="text-muted-foreground">
							{t("admin.gaMetrics.period_label")}
						</Label>
						<Select value={String(days)} onValueChange={handleDaysChange}>
							<SelectTrigger id="ga-period" className="w-36">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{GA_PERIOD_OPTIONS.map((option) => (
									<SelectItem key={option} value={String(option)}>
										{t(`admin.gaMetrics.period.days_${option}`)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				) : null}
			</div>

			{isPending ? <GaMetricsSkeleton /> : null}

			{isError ? (
				<GaChartEmptyState
					icon={TriangleAlert}
					title={t("admin.gaMetrics.error_title")}
					description={t("admin.gaMetrics.error_description")}
					retryLabel={t("admin.gaMetrics.retry")}
					onRetryClick={handleRetryClick}
				/>
			) : null}

			{data && !index ? (
				<GaChartEmptyState
					icon={ChartNoAxesColumn}
					title={t("admin.gaMetrics.empty_title")}
					description={t("admin.gaMetrics.empty_description")}
				/>
			) : null}

			{index ? (
				<>
					<GaMainChart
						lng={lng}
						index={index}
						metric={metric}
						unit={unit}
						days={days}
						onUnitChange={setUnit}
					/>
					<GaMetricCards
						lng={lng}
						index={index}
						days={days}
						selectedMetric={metric}
						onMetricSelect={setMetric}
					/>
					<GaEventTable lng={lng} index={index} onMetricSelect={setMetric} />
				</>
			) : null}
		</section>
	);
}

interface GaMetricsSectionProps extends LanguageType {}
