"use server";

import type { LanguageParams } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.server";
import { Suspense } from "react";

import {
	FeedbackSearchForm,
	FeedbackTable,
	FeedbackTableSkeleton,
} from "./_components";

interface PageProps extends LanguageParams {}

/** 받은 피드백을 모아 보는 관리자 화면 */
export default async function FeedbackPage({ params: { lng } }: PageProps) {
	const { t } = await useTranslation(lng);

	return (
		<>
			<h1 className="text-2xl font-bold mb-8">{t("admin.feedback.title")}</h1>

			<Suspense fallback={<FeedbackTableSkeleton />}>
				<div className="mb-6">
					<FeedbackSearchForm lng={lng} />
				</div>
				<FeedbackTable lng={lng} />
			</Suspense>
		</>
	);
}
