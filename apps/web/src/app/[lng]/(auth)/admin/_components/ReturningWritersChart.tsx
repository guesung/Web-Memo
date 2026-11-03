"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import type { MemoRetentionStats } from "@web-memo/shared/types";
import {
	Bar,
	BarChart,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CartesianGrid,
	ChartContainer,
	ChartTooltip,
	XAxis,
	YAxis,
} from "@web-memo/ui";

import { formatRetentionDate, formatRetentionRange } from "../_utils";

interface Props extends LanguageType {
	stats: MemoRetentionStats;
}

export default function ReturningWritersChart({ lng, stats }: Props) {
	const { t } = useTranslation(lng);
	const chartRows = stats.returning.map((row) => ({
		...row,
		confirmedUsers: row.isProvisional ? 0 : row.users,
		pendingUsers: row.isProvisional ? row.users : 0,
	}));
	const describeMonth = (row: MemoRetentionStats["returning"][number]) =>
		`${formatRetentionDate(row.monthStart, lng)}: ${t("admin.retention.returning_detail", { count: row.users })} · ${row.isProvisional ? t("admin.retention.in_progress") : t("admin.retention.confirmed")}`;

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("admin.retention.returning_title")}</CardTitle>
			</CardHeader>
			<CardContent>
				<p className="mb-3 text-xs text-muted-foreground">
					{t("admin.retention.returning_hint")}
				</p>
				<ChartContainer
					config={{
						confirmedUsers: {
							label: t("admin.retention.confirmed"),
							color: "hsl(var(--chart-2))",
						},
						pendingUsers: {
							label: t("admin.retention.in_progress"),
							color: "hsl(var(--chart-2))",
						},
					}}
					className="h-[260px] w-full"
				>
					<BarChart data={chartRows} accessibilityLayer>
						<CartesianGrid strokeDasharray="3 3" />
						<XAxis
							dataKey="monthStart"
							tickFormatter={(value: string) => formatRetentionDate(value, lng)}
							fontSize={11}
						/>
						<YAxis allowDecimals={false} fontSize={11} />
						<ChartTooltip
							content={({ active, payload }) => {
								const row = payload?.[0]?.payload as
									| MemoRetentionStats["returning"][number]
									| undefined;
								return active && row ? (
									<div className="rounded-md border bg-background p-2 text-xs shadow-md">
										{describeMonth(row)}
									</div>
								) : null;
							}}
						/>
						<Bar
							dataKey="confirmedUsers"
							stackId="writers"
							fill="var(--color-confirmedUsers)"
							radius={[4, 4, 0, 0]}
							isAnimationActive={false}
						/>
						<Bar
							dataKey="pendingUsers"
							stackId="writers"
							fill="var(--color-pendingUsers)"
							fillOpacity={0.45}
							radius={[4, 4, 0, 0]}
							isAnimationActive={false}
						/>
					</BarChart>
				</ChartContainer>
				<ol
					className="mt-3 max-h-32 space-y-1 overflow-y-auto text-xs"
					aria-label={t("admin.retention.returning_values")}
				>
					{stats.returning.map((row) => (
						<li key={row.monthStart}>
							<button
								type="button"
								className="w-full rounded px-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
							>
								{describeMonth(row)}
							</button>
						</li>
					))}
				</ol>
				<p className="mt-3 text-xs text-muted-foreground">
					{t("admin.retention.period", {
						range: formatRetentionRange(stats.returningRange, lng),
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
