"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { PATHS } from "@web-memo/shared/constants";
import { motion } from "framer-motion";
import {
	GraduationCap,
	Briefcase,
	Newspaper,
	Youtube,
	Search,
	ArrowRight,
} from "lucide-react";
import Link from "next/link";

interface UseCasesProps extends LanguageType {}

export default function UseCases({ lng }: UseCasesProps) {
	const { t } = useTranslation(lng);

	const useCases = [
		{
			icon: GraduationCap,
			emoji: "📚",
			title: t("introduce.use_case.student_title"),
			description: t("introduce.use_case.student_desc"),
			gradient: "from-indigo-500 to-purple-500",
			href: `/${lng}${PATHS.useCasesLearning}`,
		},
		{
			icon: Search,
			emoji: "🔍",
			title: t("introduce.use_case.professional_title"),
			description: t("introduce.use_case.professional_desc"),
			gradient: "from-purple-500 to-pink-500",
			href: `/${lng}${PATHS.useCasesResearch}`,
		},
		{
			icon: Briefcase,
			emoji: "💼",
			title: t("introduce.use_case.job_hunting_title"),
			description: t("introduce.use_case.job_hunting_desc"),
			gradient: "from-emerald-500 to-teal-500",
			href: `/${lng}${PATHS.useCasesJobHunting}`,
		},
		{
			icon: Newspaper,
			emoji: "📰",
			title: t("introduce.use_case.news_reading_title"),
			description: t("introduce.use_case.news_reading_desc"),
			gradient: "from-blue-500 to-cyan-500",
			href: `/${lng}${PATHS.useCasesNewsReading}`,
		},
		{
			icon: Youtube,
			emoji: "🎬",
			title: t("introduce.use_case.youtube_notes_title"),
			description: t("introduce.use_case.youtube_notes_desc"),
			gradient: "from-red-500 to-orange-500",
			href: `/${lng}${PATHS.useCasesYoutubeNotes}`,
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
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{useCases.map((useCase, index) => (
						<motion.div
							key={useCase.title}
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.5, delay: index * 0.1 }}
							className="group"
						>
							<Link href={useCase.href} className="block h-full">
								<div className="relative h-full glass-card rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] overflow-hidden">
									{/* Gradient Background on Hover */}
									<div
										className={`absolute inset-0 bg-gradient-to-br ${useCase.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
									/>

									<div className="relative z-10">
										{/* Emoji/Icon */}
										<div className="mb-4">
											<span className="text-4xl">{useCase.emoji}</span>
										</div>

										{/* Content */}
										<h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
											{useCase.title}
										</h3>
										<p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
											{useCase.description}
										</p>
										<span className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-gray-100 transition-colors">
											{t("common.learn_more")}
											<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
										</span>
									</div>

									{/* Decorative Corner Gradient */}
									<div
										className={`absolute -bottom-16 -right-16 w-32 h-32 bg-gradient-to-br ${useCase.gradient} opacity-10 rounded-full blur-3xl`}
									/>
								</div>
							</Link>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}
