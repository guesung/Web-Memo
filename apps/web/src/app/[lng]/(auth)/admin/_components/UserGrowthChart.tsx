"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { useUserGrowthQuery } from "@web-memo/shared/hooks";
import {
	Area,
	AreaChart,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CartesianGrid,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	XAxis,
	YAxis,
} from "@web-memo/ui";
import { useState } from "react";

import { TIME_PERIODS } from "../_constants";

interface UserGrowthChartProps extends LanguageType {}

export default function UserGrowthChart({ lng }: UserGrowthChartProps) {
	const { t } = useTranslation(lng);
	const [period, setPeriod] = useState("30");
	const { growthData } = useUserGrowthQuery(Number(period));

	const chartConfig = {
		count: {
			label: t("admin.growth.new_users"),
			color: "hsl(var(--chart-1))",
		},
	};

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle>{t("admin.growth.title")}</CardTitle>
				<Select value={period} onValueChange={setPeriod}>
					<SelectTrigger className="w-32">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{TIME_PERIODS.map((p) => (
							<SelectItem key={p.value} value={p.value}>
								{lng === "ko" ? p.labelKo : p.labelEn}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</CardHeader>
			<CardContent>
				<ChartContainer config={chartConfig} className="h-[300px] w-full">
					<AreaChart data={growthData}>
						<CartesianGrid strokeDasharray="3 3" />
						<XAxis
							dataKey="date"
							tickFormatter={(value: string) =>
								new Date(value).toLocaleDateString(
									lng === "ko" ? "ko-KR" : "en-US",
									{
										month: "short",
										day: "numeric",
									},
								)
							}
							fontSize={12}
						/>
						<YAxis fontSize={12} />
						<ChartTooltip
							content={
								<ChartTooltipContent
									labelFormatter={(value) =>
										new Date(value).toLocaleDateString(
											lng === "ko" ? "ko-KR" : "en-US",
										)
									}
								/>
							}
						/>
						<Area
							type="monotone"
							dataKey="count"
							stroke="var(--color-count)"
							fill="var(--color-count)"
							fillOpacity={0.3}
						/>
					</AreaChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
