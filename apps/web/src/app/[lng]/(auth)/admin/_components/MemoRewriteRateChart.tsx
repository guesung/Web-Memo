"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import type {
	MemoRetentionGranularity,
	MemoRetentionStats,
} from "@web-memo/shared/types";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CartesianGrid,
	ChartContainer,
	ChartTooltip,
	Line,
	LineChart,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	XAxis,
	YAxis,
} from "@web-memo/ui";

import { formatRetentionDate, formatRetentionRange } from "../_utils";

interface Props extends LanguageType {
	stats: MemoRetentionStats;
	granularity: MemoRetentionGranularity;
	onGranularityChange: (granularity: MemoRetentionGranularity) => void;
}

export default function MemoRewriteRateChart({
	lng,
	stats,
	granularity,
	onGranularityChange,
}: Props) {
	const { t } = useTranslation(lng);
	const chartRows = stats.cohorts.map((cohort) => ({
		...cohort,
		confirmedRate: cohort.isProvisional ? null : cohort.ratePercent,
		pendingRate: cohort.isProvisional ? cohort.ratePercent : null,
	}));
	const describeCohort = (row: MemoRetentionStats["cohorts"][number]) =>
		`${formatRetentionDate(row.periodStart, lng)}: ${t(
			"admin.retention.rewrite_detail",
			{
				retained: row.retainedUsers,
				cohort: row.cohortSize,
				rate:
					row.ratePercent === null
						? t("admin.retention.no_rate")
						: `${row.ratePercent}%`,
			},
		)} ${row.isProvisional ? t("admin.retention.observing") : t("admin.retention.confirmed")}. ${t("admin.retention.observation_detail", { observed: row.observedUsers, pending: row.pendingUsers })}`;

	return (
		<Card>
			<CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
				<CardTitle>{t("admin.retention.rewrite_title")}</CardTitle>
				<Select
					value={granularity}
					onValueChange={(value) =>
						onGranularityChange(value as MemoRetentionGranularity)
					}
				>
					<SelectTrigger
						aria-label={t("admin.retention.granularity_label")}
						className="w-32"
					>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="month">{t("admin.retention.month")}</SelectItem>
						<SelectItem value="quarter">
							{t("admin.retention.quarter")}
						</SelectItem>
					</SelectContent>
				</Select>
			</CardHeader>
			<CardContent>
				<p className="mb-3 text-xs text-muted-foreground">
					{t("admin.retention.rewrite_hint")}
				</p>
				<ChartContainer
					config={{
						confirmedRate: {
							label: t("admin.retention.confirmed"),
							color: "hsl(var(--chart-1))",
						},
						pendingRate: {
							label: t("admin.retention.observing"),
							color: "hsl(var(--chart-1))",
						},
					}}
					className="h-[260px] w-full"
				>
					<LineChart data={chartRows} accessibilityLayer>
						<CartesianGrid strokeDasharray="3 3" />
						<XAxis
							dataKey="periodStart"
							tickFormatter={(value: string) => formatRetentionDate(value, lng)}
							fontSize={11}
						/>
						<YAxis
							domain={[0, 100]}
							tickFormatter={(value: number) => `${value}%`}
							fontSize={11}
						/>
						<ChartTooltip
							content={({ active, payload }) => {
								const row = payload?.[0]?.payload as
									| MemoRetentionStats["cohorts"][number]
									| undefined;
								return active && row ? (
									<div className="rounded-md border bg-background p-2 text-xs shadow-md">
										{describeCohort(row)}
									</div>
								) : null;
							}}
						/>
						<Line
							type="monotone"
							dataKey="confirmedRate"
							connectNulls={false}
							stroke="var(--color-confirmedRate)"
							strokeWidth={2}
							dot={{ r: 3, fill: "var(--color-confirmedRate)" }}
							activeDot={{ r: 5, fill: "var(--color-confirmedRate)" }}
							isAnimationActive={false}
						/>
						<Line
							type="monotone"
							dataKey="pendingRate"
							connectNulls={false}
							stroke="none"
							dot={{
								r: 5,
								fill: "hsl(var(--background))",
								stroke: "var(--color-pendingRate)",
								strokeWidth: 2,
							}}
							activeDot={{
								r: 6,
								fill: "hsl(var(--background))",
								stroke: "var(--color-pendingRate)",
							}}
							isAnimationActive={false}
						/>
					</LineChart>
				</ChartContainer>
				<p className="mt-2 text-xs text-muted-foreground">
					<span aria-hidden="true" className="text-[hsl(var(--chart-1))]">
						●
					</span>{" "}
					{t("admin.retention.confirmed")} ·{" "}
					<span aria-hidden="true" className="text-[hsl(var(--chart-1))]">
						○
					</span>{" "}
					{t("admin.retention.observing")}
				</p>
				<ol
					className="mt-3 max-h-32 space-y-1 overflow-y-auto text-xs"
					aria-label={t("admin.retention.rewrite_values")}
				>
					{stats.cohorts.map((row) => (
						<li key={row.periodStart}>
							<button
								type="button"
								className="w-full rounded px-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
							>
								{describeCohort(row)}
							</button>
						</li>
					))}
				</ol>
				<p className="mt-3 text-xs text-muted-foreground">
					{t("admin.retention.period", {
						range: formatRetentionRange(stats.cohortRange, lng),
					})}{" "}
					·{" "}
					{t("admin.retention.as_of", {
						date: formatRetentionDate(stats.asOf, lng),
					})}
				</p>
			</CardContent>
		</Card>
	);
}
