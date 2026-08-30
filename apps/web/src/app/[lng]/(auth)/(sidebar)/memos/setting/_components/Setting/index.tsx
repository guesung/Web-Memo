"use client";

import { MOTION_VARIANTS } from "@src/constants";
import type { LanguageType } from "@src/modules/i18n";
import { Loading } from "@web-memo/ui";
import { motion } from "framer-motion";
import { Suspense } from "react";
import SettingCategoryForm from "./SettingCategoryForm";
import SettingExport from "./SettingExport";
import SettingGuide from "./SettingGuide";
import SettingLanguage from "./SettingLanguage";
import SettingMemoFields from "./SettingMemoFields";

interface SettingProps extends LanguageType {}

export default function Setting({ lng }: SettingProps) {
	return (
		<motion.section
			className="grid gap-6"
			variants={MOTION_VARIANTS.fadeInAndOut}
			initial="initial"
			animate="animate"
			exit="exit"
		>
			<Suspense fallback={<Loading />}>
				<SettingLanguage lng={lng} />
				<SettingMemoFields lng={lng} />
				<SettingGuide lng={lng} />
				<SettingExport lng={lng} />
				<SettingCategoryForm lng={lng} />
			</Suspense>
		</motion.section>
	);
}
