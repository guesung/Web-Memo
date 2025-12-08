"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { motion } from "framer-motion";
import { Building2, ClipboardList, Star, Search } from "lucide-react";

interface BenefitsProps extends LanguageType {}

export default function Benefits({ lng }: BenefitsProps) {
	const { t } = useTranslation(lng);

	const benefits = [
		{
			icon: Building2,
			title: t("useCases.jobHunting.benefits.company.title"),
			description: t("useCases.jobHunting.benefits.company.description"),
			iconBg: "bg-emerald-500/10",
			iconColor: "text-emerald-500",
		},
		{
			icon: ClipboardList,
			title: t("useCases.jobHunting.benefits.track.title"),
			description: t("useCases.jobHunting.benefits.track.description"),
			iconBg: "bg-teal-500/10",
			iconColor: "text-teal-500",
		},
		{
			icon: Star,
			title: t("useCases.jobHunting.benefits.compare.title"),
			description: t("useCases.jobHunting.benefits.compare.description"),
			iconBg: "bg-green-500/10",
			iconColor: "text-green-500",
		},
		{
			icon: Search,
			title: t("useCases.jobHunting.benefits.find.title"),
			description: t("useCases.jobHunting.benefits.find.description"),
			iconBg: "bg-lime-500/10",
			iconColor: "text-lime-500",
		},
	];

	return (
		<section className="py-20 bg-gray-50 dark:bg-gray-900/50">
			<div className="mx-auto max-w-6xl px-4">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5 }}
					className="text-center mb-16"
				>
					<h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
						{t("useCases.jobHunting.benefits.title")}
					</h2>
					<p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
						{t("useCases.jobHunting.benefits.subtitle")}
					</p>
				</motion.div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					{benefits.map((benefit, index) => (
						<motion.div
							key={benefit.title}
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.5, delay: index * 0.1 }}
							className="group"
						>
							<div className="relative h-full bg-white dark:bg-gray-800 rounded-2xl p-8 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] border border-gray-100 dark:border-gray-700">
								<div
									className={`inline-flex p-4 rounded-xl ${benefit.iconBg} mb-6`}
								>
									<benefit.icon className={`h-8 w-8 ${benefit.iconColor}`} />
								</div>

								<h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
									{benefit.title}
								</h3>

								<p className="text-gray-600 dark:text-gray-400 leading-relaxed">
									{benefit.description}
								</p>
							</div>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}
