import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { useAdminMonthlyRewriteRateQuery } from "@web-memo/shared/hooks";
import {
	Bar,
	BarChart,
	Card,
	CardContent,
	CartesianGrid,
	Cell,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	cn,
	LabelList,
	XAxis,
	YAxis,
} from "@web-memo/ui";
import { ChartNoAxesColumn, TriangleAlert } from "lucide-react";
import type { QuarterSummary } from "../_types";
import {
	buildMonthlyBars,
	buildQuarterSummaries,
	getMonthlyRateCeiling,
} from "../_utils";
import GaChartEmptyState from "./GaChartEmptyState";
import RetentionTabSkeleton from "./RetentionTabSkeleton";

/** 첫 메모를 쓴 달별로, 7~30일 안에 메모를 다시 쓴 사람의 비율을 막대로 보여준다. */
export default function MonthlyRewriteTab({ lng }: LanguageType) {
	const { t } = useTranslation(lng);
	const { data, isPending, isError, refetch } =
		useAdminMonthlyRewriteRateQuery();

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

	const bars = buildMonthlyBars(data);

	if (bars.length === 0) {
		return (
			<GaChartEmptyState
				icon={ChartNoAxesColumn}
				title={t("admin.retention.monthly.empty_title")}
				description={t("admin.retention.monthly.empty_description")}
			/>
		);
	}

	const { recent, prior } = buildQuarterSummaries(data);
	const chartConfig = {
		percent: {
			label: t("admin.retention.monthly.rate"),
			color: "hsl(var(--primary))",
		},
	};

	return (
		<Card>
			<CardContent className="flex flex-col gap-4 p-6">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="flex flex-col gap-1">
						<h3 className="text-lg font-semibold">
							{t("admin.retention.monthly.title")}
						</h3>
						<p className="text-sm text-muted-foreground">
							{t("admin.retention.monthly.description")}
						</p>
					</div>
					<div className="flex flex-wrap gap-3">
						{prior ? <QuarterCard lng={lng} summary={prior} /> : null}
						{recent ? (
							<QuarterCard lng={lng} summary={recent} highlighted />
						) : null}
					</div>
				</div>

				<ChartContainer
					config={chartConfig}
					className="aspect-auto h-[280px] w-full"
					role="img"
					aria-label={t("admin.retention.monthly.chart_label")}
				>
					<BarChart data={bars} margin={{ top: 20, right: 8, left: 0 }}>
						<CartesianGrid strokeDasharray="3 3" vertical={false} />
						<XAxis dataKey="label" fontSize={11} interval="preserveStartEnd" />
						<YAxis
							fontSize={12}
							domain={[0, getMonthlyRateCeiling(bars)]}
							tickFormatter={(value: number) => `${value}%`}
							width={44}
						/>
						<ChartTooltip
							content={
								<ChartTooltipContent
									formatter={(value, _name, item) =>
										t("admin.retention.monthly.tooltip", {
											percent: value,
											rewriters: item.payload.rewriters,
											newWriters: item.payload.newWriters,
										})
									}
								/>
							}
						/>
						<Bar
							dataKey="percent"
							radius={[3, 3, 0, 0]}
							isAnimationActive={false}
						>
							{bars.map((bar) => (
								<Cell
									key={bar.label}
									fill={
										bar.small
											? "hsl(var(--muted-foreground))"
											: "var(--color-percent)"
									}
									fillOpacity={bar.incomplete ? 0.35 : 1}
								/>
							))}
							<LabelList
								dataKey="newWriters"
								position="top"
								fontSize={11}
								className="fill-muted-foreground"
							/>
						</Bar>
					</BarChart>
				</ChartContainer>

				<div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
					<span className="flex items-center gap-1.5">
						<span className="size-3.5 rounded-sm bg-primary" />
						{t("admin.retention.monthly.legend_enough")}
					</span>
					<span className="flex items-center gap-1.5">
						<span className="size-3.5 rounded-sm bg-muted-foreground" />
						{t("admin.retention.monthly.legend_small")}
					</span>
					<span className="flex items-center gap-1.5">
						<span className="size-3.5 rounded-sm bg-primary/35" />
						{t("admin.retention.monthly.legend_incomplete")}
					</span>
				</div>
				<p className="rounded-md bg-highlight-yellow px-3 py-2 text-[13px] text-highlight-yellow-foreground">
					{t("admin.retention.monthly.highlight_warning")}
				</p>
			</CardContent>
		</Card>
	);
}

function QuarterCard({ lng, summary, highlighted }: QuarterCardProps) {
	const { t } = useTranslation(lng);
	const toLabel = ({ year, quarter }: { year: number; quarter: number }) =>
		t("admin.retention.monthly.quarter", {
			year: String(year).slice(2),
			quarter,
		});

	return (
		<div
			className={cn(
				"flex flex-col gap-0.5 rounded-lg border px-4 py-3",
				highlighted && "border-primary",
			)}
		>
			<span className="text-xs text-muted-foreground">
				{toLabel(summary.from)}~{toLabel(summary.to)}
			</span>
			<span className={cn("text-xl font-bold", highlighted && "text-primary")}>
				{summary.percent}%
			</span>
			<span className="text-xs text-muted-foreground">
				{t("admin.retention.monthly.quarter_count", {
					rewriters: summary.rewriters,
					newWriters: summary.newWriters,
				})}
			</span>
		</div>
	);
}

interface QuarterCardProps extends LanguageType {
	summary: QuarterSummary;
	/** 가장 최근 묶음을 강조한다 */
	highlighted?: boolean;
}
