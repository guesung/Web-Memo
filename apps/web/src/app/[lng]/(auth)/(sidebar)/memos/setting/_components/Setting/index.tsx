"use client";

import { MOTION_VARIANTS } from "@src/constants";
import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { Skeleton } from "@web-memo/ui";
import { motion } from "framer-motion";
import { Suspense } from "react";

import SettingCategoryForm from "./SettingCategoryForm";
import SettingExport from "./SettingExport";
import SettingGuide from "./SettingGuide";
import SettingLanguage from "./SettingLanguage";
import SettingMemoFields from "./SettingMemoFields";
import SettingSection from "./SettingSection";

interface IFSettingProps extends LanguageType {}

/**
 * 설정 화면의 본체. 다섯 섹션을 의미 단위 카드 네 장으로 묶는다.
 *
 * @description Suspense를 카드 안쪽에 둔다. 예전에는 페이지 전체가 스피너 하나로 덮여
 * 언어·가이드처럼 기다릴 것이 없는 설정까지 같이 사라졌다.
 */
export default function Setting({ lng }: IFSettingProps) {
	const { t } = useTranslation(lng);

	return (
		<motion.section
			className="grid gap-4"
			variants={MOTION_VARIANTS.fadeInAndOut}
			initial="initial"
			animate="animate"
			exit="exit"
		>
			<SettingSection title={t("setting.sectionGeneral")}>
				<SettingLanguage lng={lng} />
				<SettingGuide lng={lng} />
			</SettingSection>

			<SettingSection
				title={t("setting.sectionMemoWriting")}
				description={t("setting.sectionMemoWritingDescription")}
			>
				<Suspense fallback={<SettingValueSkeleton />}>
					<SettingMemoFields lng={lng} />
				</Suspense>
			</SettingSection>

			<SettingSection
				title={t("setting.category")}
				description={t("setting.categoryDescription")}
			>
				<Suspense fallback={<SettingValueSkeleton />}>
					<SettingCategoryForm lng={lng} />
				</Suspense>
			</SettingSection>

			<SettingSection title={t("setting.sectionData")}>
				<SettingExport lng={lng} />
			</SettingSection>
		</motion.section>
	);
}

/** 카드 골격은 그대로 두고 값이 들어올 자리만 비워 둔다 */
function SettingValueSkeleton() {
	return (
		<div className="space-y-2">
			<Skeleton className="h-6 w-full" />
			<Skeleton className="h-6 w-2/3" />
		</div>
	);
}
