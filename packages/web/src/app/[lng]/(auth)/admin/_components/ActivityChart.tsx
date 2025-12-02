"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { useAdminStatsQuery } from "@web-memo/shared/hooks";
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
	ChartTooltipContent,
	XAxis,
	YAxis,
} from "@web-memo/ui";

interface ActivityChartProps extends LanguageType {}

export default function ActivityChart({ lng }: ActivityChartProps) {
	const { t } = useTranslation(lng);
	const { stats } = useAdminStatsQuery();

	const activityData = [
		{
			name: t("admin.activity.today"),
			memos: stats?.todayMemos ?? 0,
		},
		{
			name: t("admin.activity.this_week"),
			memos: stats?.weeklyMemos ?? 0,
		},
		{
			name: t("admin.activity.this_month"),
			memos: stats?.monthlyMemos ?? 0,
		},
	];

	const chartConfig = {
		memos: {
			label: t("admin.activity.memos"),
			color: "hsl(var(--chart-2))",
		},
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("admin.activity.title")}</CardTitle>
			</CardHeader>
			<CardContent>
				<ChartContainer config={chartConfig} className="h-[300px] w-full">
					<BarChart data={activityData}>
						<CartesianGrid strokeDasharray="3 3" />
						<XAxis dataKey="name" fontSize={12} />
						<YAxis fontSize={12} />
						<ChartTooltip content={<ChartTooltipContent />} />
						<Bar
							dataKey="memos"
							fill="var(--color-memos)"
							radius={[4, 4, 0, 0]}
						/>
					</BarChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
