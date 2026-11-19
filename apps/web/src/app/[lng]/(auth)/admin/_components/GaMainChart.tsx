import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import {
	Area,
	AreaChart,
	Button,
	Card,
	CardContent,
	CartesianGrid,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	cn,
	ReferenceArea,
	XAxis,
	YAxis,
} from "@web-memo/ui";
import {
	GA_ACTIVE_USERS_METRIC,
	GA_CORE_METRICS,
	GA_FETCH_DAYS,
	GA_INFLATED_EVENTS,
} from "../_constants";
import type { GaMetricUnit } from "../_types";
import {
	buildSeries,
	findMissingRanges,
	formatAverage,
	formatDelta,
	formatShortDate,
	type GaMetricsIndex,
	summarizeSeries,
} from "../_utils";
import GaTrendBadge from "./GaTrendBadge";

/** 선택한 지표의 추이. 적재가 빠진 날은 선을 끊고 회색 칸으로 표시한다. */
export default function GaMainChart({
	lng,
	index,
	metric,
	unit,
	days,
	onUnitChange,
}: GaMainChartProps) {
	const { t } = useTranslation(lng);
	const coreMetric = GA_CORE_METRICS.find(({ key }) => key === metric);
	const label = coreMetric ? t(coreMetric.labelKey) : metric;
	// 활성 사용자는 건수가 없다. 건수가 골라져 있어도 사람 수로 읽는다.
	const isCountDisabled = metric === GA_ACTIVE_USERS_METRIC;
	const effectiveUnit = isCountDisabled ? "users" : unit;
	const fullSeries = buildSeries({
		index,
		metric,
		unit: effectiveUnit,
		days: GA_FETCH_DAYS,
	});
	const summary = summarizeSeries(fullSeries);
	const series = fullSeries.slice(-days);
	const points = series.map((point, position) => ({ ...point, position }));
	const missingRanges = findMissingRanges(series);
	const tickStep = days <= 7 ? 1 : days <= 30 ? 5 : 15;
	const ticks = points
		.filter(({ position }) => position % tickStep === 0)
		.map(({ position }) => position);
	const showInflatedWarning =
		effectiveUnit === "events" && GA_INFLATED_EVENTS.includes(metric);
	const chartConfig = {
		value: { label, color: "hsl(var(--primary))" },
	};

	return (
		<Card>
			<CardContent className="flex flex-col gap-4 p-6">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="flex flex-col gap-1">
						<div className="flex flex-wrap items-center gap-2">
							{coreMetric ? (
								<span className="text-lg font-semibold">{label}</span>
							) : null}
							<code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
								{metric}
							</code>
							{summary.badge ? (
								<GaTrendBadge lng={lng} kind={summary.badge} />
							) : null}
						</div>
						<span className="text-sm text-muted-foreground">
							{summary.average === null
								? t("admin.gaMetrics.summary_no_average", {
										yesterday: summary.yesterday,
									})
								: t("admin.gaMetrics.summary", {
										yesterday: summary.yesterday,
										average: formatAverage(summary.average),
										delta: formatDelta(summary.deltaPercent),
									})}
						</span>
					</div>
					<fieldset
						className="flex gap-1 rounded-lg bg-muted p-1"
						aria-label={t("admin.gaMetrics.unit_label")}
					>
						<UnitButton
							active={effectiveUnit === "users"}
							onClick={() => onUnitChange("users")}
						>
							{t("admin.gaMetrics.unit.users")}
						</UnitButton>
						<UnitButton
							active={effectiveUnit === "events"}
							disabled={isCountDisabled}
							onClick={() => onUnitChange("events")}
						>
							{t("admin.gaMetrics.unit.events")}
						</UnitButton>
					</fieldset>
				</div>

				{showInflatedWarning ? (
					<p className="rounded-md bg-highlight-yellow px-3 py-2 text-[13px] text-highlight-yellow-foreground">
						{t("admin.gaMetrics.inflated_warning")}
					</p>
				) : null}

				<ChartContainer
					config={chartConfig}
					className="aspect-auto h-[260px] w-full"
					role="img"
					aria-label={t("admin.gaMetrics.chart_label", { metric: label, days })}
				>
					<AreaChart data={points} margin={{ top: 16, right: 8, left: 0 }}>
						<CartesianGrid strokeDasharray="3 3" vertical={false} />
						<XAxis
							dataKey="position"
							type="number"
							domain={[-0.5, points.length - 0.5]}
							ticks={ticks}
							tickFormatter={(position: number) =>
								formatShortDate(points[position].date)
							}
							fontSize={12}
						/>
						<YAxis
							fontSize={12}
							allowDecimals={false}
							domain={[0, "auto"]}
							width={40}
						/>
						{missingRanges.map(({ start, end }) => (
							<ReferenceArea
								key={start}
								x1={start - 0.5}
								x2={end + 0.5}
								fill="hsl(var(--foreground))"
								fillOpacity={0.06}
								label={{
									value: t("admin.gaMetrics.missing_label"),
									position: "insideTop",
									fontSize: 11,
									fill: "hsl(var(--muted-foreground))",
								}}
							/>
						))}
						<ChartTooltip
							content={
								<ChartTooltipContent
									labelFormatter={(_, payload) =>
										payload?.[0]?.payload.date ?? ""
									}
								/>
							}
						/>
						<Area
							type="monotone"
							dataKey="value"
							stroke="var(--color-value)"
							fill="var(--color-value)"
							fillOpacity={0.12}
							strokeWidth={2}
							dot={{ r: 2 }}
							connectNulls={false}
							isAnimationActive={false}
						/>
					</AreaChart>
				</ChartContainer>
				<p className="text-[13px] text-muted-foreground">
					{t("admin.gaMetrics.missing_hint")}
				</p>
			</CardContent>
		</Card>
	);
}

function UnitButton({ active, disabled, onClick, children }: UnitButtonProps) {
	return (
		<Button
			type="button"
			variant="ghost"
			size="sm"
			aria-pressed={active}
			disabled={disabled}
			onClick={onClick}
			className={cn(
				"h-8 text-muted-foreground",
				active && "bg-background font-semibold text-foreground shadow-sm",
			)}
		>
			{children}
		</Button>
	);
}

interface UnitButtonProps {
	active: boolean;
	disabled?: boolean;
	onClick: () => void;
	children: React.ReactNode;
}

interface GaMainChartProps extends LanguageType {
	index: GaMetricsIndex;
	metric: string;
	unit: GaMetricUnit;
	/** 그릴 최근 일수 */
	days: number;
	onUnitChange: (unit: GaMetricUnit) => void;
}
