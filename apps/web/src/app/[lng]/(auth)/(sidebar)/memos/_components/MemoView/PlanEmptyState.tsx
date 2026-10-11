"use client";

import LocalizedLink from "@src/components/LocalizedLink";
import type { LanguageType } from "@src/modules/i18n";
import { PATHS } from "@web-memo/shared/constants";
import { Button } from "@web-memo/ui";
import { motion } from "framer-motion";
import { CalendarClock } from "lucide-react";
import { useTranslation } from "react-i18next";

/** 읽을 계획이 하나도 없을 때 보여주는 빈 상태. 검색 결과 없음은 MemoSearchEmptyState가 맡는다. */
export default function PlanEmptyState({ lng }: LanguageType) {
	const { t } = useTranslation(lng);

	return (
		<motion.div
			data-testid="plan-empty-state"
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			className="flex flex-col items-center justify-center min-h-[60vh] px-4"
		>
			<div className="w-20 h-20 mb-6 rounded-full bg-primary/10 flex items-center justify-center">
				<CalendarClock className="h-10 w-10 text-primary" />
			</div>

			<h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 text-center">
				{t("memos.plan.emptyTitle")}
			</h3>

			<p className="text-muted-foreground text-center max-w-md">
				{t("memos.plan.emptyHint")}
			</p>

			<Button variant="outline" className="mt-6" asChild>
				<LocalizedLink lng={lng} href={PATHS.memos}>
					{t("memos.plan.emptyAction")}
				</LocalizedLink>
			</Button>
		</motion.div>
	);
}
