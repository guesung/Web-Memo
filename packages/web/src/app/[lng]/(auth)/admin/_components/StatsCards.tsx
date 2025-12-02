"use client";

import type { LanguageType } from "@src/modules/i18n";
import { useAdminStatsQuery } from "@web-memo/shared/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@web-memo/ui";
import { Calendar, FileText, TrendingUp, Users } from "lucide-react";

interface StatsCardsProps extends LanguageType {}

export default function StatsCards({ lng }: StatsCardsProps) {
	const { stats } = useAdminStatsQuery();

	const cards = [
		{
			title: lng === "ko" ? "전체 사용자" : "Total Users",
			value: stats?.totalUsers ?? 0,
			icon: Users,
			color: "text-blue-500",
		},
		{
			title: lng === "ko" ? "전체 메모" : "Total Memos",
			value: stats?.totalMemos ?? 0,
			icon: FileText,
			color: "text-green-500",
		},
		{
			title: lng === "ko" ? "오늘 메모" : "Today's Memos",
			value: stats?.todayMemos ?? 0,
			icon: TrendingUp,
			color: "text-purple-500",
		},
		{
			title: lng === "ko" ? "이번 주 메모" : "Weekly Memos",
			value: stats?.weeklyMemos ?? 0,
			icon: Calendar,
			color: "text-amber-500",
		},
	];

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
			{cards.map((card) => (
				<Card key={card.title}>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							{card.title}
						</CardTitle>
						<card.icon className={`h-5 w-5 ${card.color}`} />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{card.value.toLocaleString()}
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	);
}
