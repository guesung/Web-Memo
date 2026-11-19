"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@web-memo/ui";
import MonthlyRewriteTab from "./MonthlyRewriteTab";
import WeeklyRetentionTab from "./WeeklyRetentionTab";

/** 메모 리텐션 섹션. 탭마다 자기 쿼리를 갖고, 열린 탭만 조회한다. */
export default function RetentionSection({ lng }: RetentionSectionProps) {
	const { t } = useTranslation(lng);

	return (
		<section className="flex flex-col gap-6">
			<Tabs defaultValue="weekly" className="flex flex-col gap-6">
				<div className="flex flex-wrap items-end justify-between gap-4">
					<div className="flex flex-col gap-1.5">
						<h2 className="text-xl font-bold">{t("admin.retention.title")}</h2>
						<p className="text-sm text-muted-foreground">
							{t("admin.retention.subtitle")}
						</p>
					</div>
					<TabsList aria-label={t("admin.retention.tabs_label")}>
						<TabsTrigger value="weekly">
							{t("admin.retention.tab_weekly")}
						</TabsTrigger>
						<TabsTrigger value="monthly">
							{t("admin.retention.tab_monthly")}
						</TabsTrigger>
					</TabsList>
				</div>
				<TabsContent value="weekly" className="mt-0">
					<WeeklyRetentionTab lng={lng} />
				</TabsContent>
				<TabsContent value="monthly" className="mt-0">
					<MonthlyRewriteTab lng={lng} />
				</TabsContent>
			</Tabs>
		</section>
	);
}

interface RetentionSectionProps extends LanguageType {}
