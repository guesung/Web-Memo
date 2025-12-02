"use client";

import type { LanguageType } from "@src/modules/i18n";
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
	const { stats } = useAdminStatsQuery();

	const activityData = [
		{
			name: lng === "ko" ? "오늘" : "Today",
			memos: stats?.todayMemos ?? 0,
		},
		{
			name: lng === "ko" ? "이번 주" : "This Week",
			memos: stats?.weeklyMemos ?? 0,
		},
		{
			name: lng === "ko" ? "이번 달" : "This Month",
			memos: stats?.monthlyMemos ?? 0,
		},
	];

	const chartConfig = {
		memos: {
			label: lng === "ko" ? "메모 수" : "Memos",
			color: "hsl(var(--chart-2))",
		},
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>{lng === "ko" ? "메모 활동" : "Memo Activity"}</CardTitle>
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
