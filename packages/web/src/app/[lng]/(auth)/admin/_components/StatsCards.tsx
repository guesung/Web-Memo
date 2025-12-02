"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import useAdminStatsQuery from "@web-memo/shared/hooks/supabase/queries/useAdminStatsQuery";
import { Card, CardContent, CardHeader, CardTitle } from "@web-memo/ui";
import { Calendar, FileText, TrendingUp, Users } from "lucide-react";

interface StatsCardsProps extends LanguageType {}

export default function StatsCards({ lng }: StatsCardsProps) {
	const { t } = useTranslation(lng);
	const { stats } = useAdminStatsQuery();

	const cards = [
		{
			titleKey: "admin.stats.total_users",
			value: stats?.totalUsers ?? 0,
			icon: Users,
			color: "text-blue-500",
		},
		{
			titleKey: "admin.stats.total_memos",
			value: stats?.totalMemos ?? 0,
			icon: FileText,
			color: "text-green-500",
		},
		{
			titleKey: "admin.stats.today_memos",
			value: stats?.todayMemos ?? 0,
			icon: TrendingUp,
			color: "text-purple-500",
		},
		{
			titleKey: "admin.stats.weekly_memos",
			value: stats?.weeklyMemos ?? 0,
			icon: Calendar,
			color: "text-amber-500",
		},
	];

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
			{cards.map((card) => (
				<Card key={card.titleKey}>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							{t(card.titleKey)}
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
