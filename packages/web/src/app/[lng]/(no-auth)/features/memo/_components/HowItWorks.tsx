"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { motion } from "framer-motion";
import { PanelRight, Pencil, CheckCircle } from "lucide-react";

interface HowItWorksProps extends LanguageType {}

export default function HowItWorks({ lng }: HowItWorksProps) {
	const { t } = useTranslation(lng);

	const steps = [
		{
			icon: PanelRight,
			step: "01",
			title: t("features.memo.howItWorks.step1.title"),
			description: t("features.memo.howItWorks.step1.description"),
		},
		{
			icon: Pencil,
			step: "02",
			title: t("features.memo.howItWorks.step2.title"),
			description: t("features.memo.howItWorks.step2.description"),
		},
		{
			icon: CheckCircle,
			step: "03",
			title: t("features.memo.howItWorks.step3.title"),
			description: t("features.memo.howItWorks.step3.description"),
		},
	];

	return (
		<section className="py-20">
			<div className="mx-auto max-w-6xl px-4">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5 }}
					className="text-center mb-16"
				>
					<h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
						{t("features.memo.howItWorks.title")}
					</h2>
					<p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
						{t("features.memo.howItWorks.subtitle")}
					</p>
				</motion.div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
					{steps.map((step, index) => (
						<motion.div
							key={step.step}
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.5, delay: index * 0.15 }}
							className="relative"
						>
							<div className="text-center">
								<div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-6">
									<step.icon className="h-8 w-8 text-blue-500" />
								</div>

								<div className="text-sm font-bold text-blue-500 mb-2">
									{step.step}
								</div>

								<h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
									{step.title}
								</h3>

								<p className="text-gray-600 dark:text-gray-400">
									{step.description}
								</p>
							</div>

							{index < steps.length - 1 && (
								<div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-blue-200 to-transparent dark:from-blue-800" />
							)}
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}
