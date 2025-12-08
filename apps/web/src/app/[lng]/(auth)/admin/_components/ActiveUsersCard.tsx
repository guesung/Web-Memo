"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { useActiveUsersStatsQuery } from "@web-memo/shared/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@web-memo/ui";
import { Activity, CalendarDays, CalendarRange } from "lucide-react";

export default function ActiveUsersCard({ lng }: LanguageType) {
	const { t } = useTranslation(lng);
	const { stats } = useActiveUsersStatsQuery();

	const cards = [
		{
			titleKey: "admin.activeUsers.daily",
			value: stats?.dailyActiveUsers ?? 0,
			icon: Activity,
			color: "text-rose-500",
		},
		{
			titleKey: "admin.activeUsers.weekly",
			value: stats?.weeklyActiveUsers ?? 0,
			icon: CalendarDays,
			color: "text-cyan-500",
		},
		{
			titleKey: "admin.activeUsers.monthly",
			value: stats?.monthlyActiveUsers ?? 0,
			icon: CalendarRange,
			color: "text-indigo-500",
		},
	];

	return (
		<section>
			<h2 className="text-lg font-semibold mb-4">
				{t("admin.activeUsers.title")}
			</h2>
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
		</section>
	);
}
