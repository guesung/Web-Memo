"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { motion } from "framer-motion";
import { GraduationCap, Briefcase, Target, Lightbulb } from "lucide-react";

interface UseCasesProps extends LanguageType {}

export default function UseCases({ lng }: UseCasesProps) {
	const { t } = useTranslation(lng);

	const useCases = [
		{
			icon: GraduationCap,
			emoji: "📚",
			title: t("introduce.use_case.student_title"),
			description: t("introduce.use_case.student_desc"),
			color: "blue",
			gradient: "from-blue-500 to-indigo-500",
		},
		{
			icon: Briefcase,
			emoji: "💼",
			title: t("introduce.use_case.professional_title"),
			description: t("introduce.use_case.professional_desc"),
			color: "purple",
			gradient: "from-purple-500 to-pink-500",
		},
		{
			icon: Target,
			emoji: "🎯",
			title: t("introduce.use_case.efficiency_title"),
			description: t("introduce.use_case.efficiency_desc"),
			color: "green",
			gradient: "from-green-500 to-emerald-500",
		},
		{
			icon: Lightbulb,
			emoji: "💡",
			title: t("introduce.use_case.creator_title"),
			description: t("introduce.use_case.creator_desc"),
			color: "amber",
			gradient: "from-amber-500 to-orange-500",
		},
	];

	return (
		<section className="py-20 bg-gray-50 dark:bg-gray-900/50">
			<div className="mx-auto max-w-6xl px-4">
				{/* Section Header */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5 }}
					className="text-center mb-16"
				>
					<h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
						{t("introduce.section.use_cases")}
					</h2>
					<p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
						{t("introduce.section.use_cases_desc")}
					</p>
				</motion.div>

				{/* Use Cases Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					{useCases.map((useCase, index) => (
						<motion.div
							key={useCase.title}
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.5, delay: index * 0.1 }}
							className="group"
						>
							<div className="relative h-full glass-card rounded-2xl p-8 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] overflow-hidden">
								{/* Gradient Background on Hover */}
								<div
									className={`absolute inset-0 bg-gradient-to-br ${useCase.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
								/>

								<div className="relative z-10 flex gap-6">
									{/* Emoji/Icon */}
									<div className="flex-shrink-0">
										<span className="text-5xl">{useCase.emoji}</span>
									</div>

									{/* Content */}
									<div>
										<h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
											{useCase.title}
										</h3>
										<p className="text-gray-600 dark:text-gray-400 leading-relaxed">
											{useCase.description}
										</p>
									</div>
								</div>

								{/* Decorative Corner Gradient */}
								<div
									className={`absolute -bottom-20 -right-20 w-40 h-40 bg-gradient-to-br ${useCase.gradient} opacity-10 rounded-full blur-3xl`}
								/>
							</div>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}
