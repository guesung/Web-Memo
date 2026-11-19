import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { useAdminWeeklyRetentionQuery } from "@web-memo/shared/hooks";
import { getLastCompleteWeekStart } from "@web-memo/shared/utils";
import { Card, CardContent, cn } from "@web-memo/ui";
import { ChartNoAxesColumn, TriangleAlert } from "lucide-react";
import { RETENTION_WEEKS, SMALL_COHORT_SIZE } from "../_constants";
import {
	averageRetention,
	buildWeeklyCohorts,
	formatShortDate,
	getRetentionLevel,
} from "../_utils";
import GaChartEmptyState from "./GaChartEmptyState";
import RetentionTabSkeleton from "./RetentionTabSkeleton";

/** 단계별(낮음→높음) 셀 색. 같은 파랑의 농도로만 구분한다. */
const LEVEL_STYLES = {
	1: "bg-primary/15 text-foreground",
	2: "bg-primary/40 text-foreground",
	3: "bg-primary/70 text-primary-foreground",
	4: "bg-primary text-primary-foreground",
} as const;

const OFFSETS = Array.from({ length: RETENTION_WEEKS }, (_, offset) => offset);

/** 첫 활동 주별로, N주 뒤에도 쓰는 사람의 비율을 한 표로 보여준다. */
export default function WeeklyRetentionTab({ lng }: LanguageType) {
	const { t } = useTranslation(lng);
	const weekStart = getLastCompleteWeekStart();
	const { data, isPending, isError, refetch } = useAdminWeeklyRetentionQuery({
		weekStart,
		weeks: RETENTION_WEEKS,
	});

	const handleRetryClick = () => {
		refetch();
	};

	if (isPending) return <RetentionTabSkeleton />;

	if (isError) {
		return (
			<GaChartEmptyState
				icon={TriangleAlert}
				title={t("admin.retention.error_title")}
				description={t("admin.retention.error_description")}
				retryLabel={t("admin.retention.retry")}
				onRetryClick={handleRetryClick}
			/>
		);
	}

	const cohorts = buildWeeklyCohorts({
		rows: data,
		weekStart,
		weeks: RETENTION_WEEKS,
	});

	if (cohorts.length === 0) {
		return (
			<GaChartEmptyState
				icon={ChartNoAxesColumn}
				title={t("admin.retention.weekly.empty_title")}
				description={t("admin.retention.weekly.empty_description")}
			/>
		);
	}

	const week1 = averageRetention(cohorts, 1);
	const week4 = averageRetention(cohorts, 4);

	return (
		<Card>
			<CardContent className="flex flex-col gap-4 p-6">
				<div className="flex flex-col gap-1">
					<h3 className="text-lg font-semibold">
						{t("admin.retention.weekly.title")}
					</h3>
					<p className="text-sm text-muted-foreground">
						{t("admin.retention.weekly.description", {
							week1: week1 === null ? "–" : `${week1}%`,
							week4: week4 === null ? "–" : `${week4}%`,
						})}
					</p>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full min-w-[720px] border-separate border-spacing-1 text-[13px]">
						<thead>
							<tr className="text-muted-foreground">
								<th scope="col" className="px-2 py-1 text-left font-medium">
									{t("admin.retention.weekly.cohort_week")}
								</th>
								<th scope="col" className="px-2 py-1 text-right font-medium">
									{t("admin.retention.weekly.size_header")}
								</th>
								{OFFSETS.map((offset) => (
									<th
										key={offset}
										scope="col"
										className="px-2 py-1 text-center font-medium"
									>
										{t("admin.retention.weekly.offset", { offset })}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{cohorts.map((cohort) => {
								const isSmall = cohort.size < SMALL_COHORT_SIZE;
								const weekLabel = formatShortDate(cohort.week);

								return (
									<tr key={cohort.week}>
										<th
											scope="row"
											className="whitespace-nowrap px-2 py-1 text-left font-medium"
										>
											{weekLabel}
										</th>
										<td
											className={cn(
												"px-2 py-1 text-right",
												isSmall && "text-muted-foreground",
											)}
										>
											{t("admin.retention.weekly.size", { size: cohort.size })}
										</td>
										{OFFSETS.map((offset) => {
											const cell = cohort.cells[offset];

											return cell ? (
												<td
													key={offset}
													title={t("admin.retention.weekly.cell_title", {
														week: weekLabel,
														offset,
														users: cell.activeUsers,
														size: cohort.size,
													})}
													className={cn(
														"min-w-14 rounded px-2 py-2 text-center",
														offset === 0
															? "bg-muted text-muted-foreground"
															: LEVEL_STYLES[getRetentionLevel(cell.percent)],
														isSmall && "opacity-45",
													)}
												>
													{cell.percent}%
												</td>
											) : (
												<td
													key={offset}
													title={t("admin.retention.weekly.not_yet")}
													className="min-w-14 px-2 py-2"
												/>
											);
										})}
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
				<div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
					<span className="flex items-center gap-1.5">
						<span className="size-3.5 rounded-sm bg-primary/15" />
						{t("admin.retention.weekly.legend_low")}
					</span>
					<span className="flex items-center gap-1.5">
						<span className="size-3.5 rounded-sm bg-primary" />
						{t("admin.retention.weekly.legend_high")}
					</span>
					<span>{t("admin.retention.weekly.legend_note")}</span>
				</div>
			</CardContent>
		</Card>
	);
}
