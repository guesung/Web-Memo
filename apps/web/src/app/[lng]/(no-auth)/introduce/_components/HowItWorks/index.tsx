"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { motion } from "framer-motion";
import { Download, PanelRightOpen, BookmarkPlus, ArrowRight } from "lucide-react";

interface HowItWorksProps extends LanguageType {}

export default function HowItWorks({ lng }: HowItWorksProps) {
	const { t } = useTranslation(lng);

	const steps = [
		{
			number: 1,
			icon: Download,
			title: t("introduce.steps.step1_title"),
			description: t("introduce.steps.step1_desc"),
			color: "purple",
			gradient: "from-purple-500 to-blue-500",
		},
		{
			number: 2,
			icon: PanelRightOpen,
			title: t("introduce.steps.step2_title"),
			description: t("introduce.steps.step2_desc"),
			color: "blue",
			gradient: "from-blue-500 to-cyan-500",
		},
		{
			number: 3,
			icon: BookmarkPlus,
			title: t("introduce.steps.step3_title"),
			description: t("introduce.steps.step3_desc"),
			color: "cyan",
			gradient: "from-cyan-500 to-green-500",
		},
	];

	return (
		<section className="py-20 bg-white dark:bg-gray-900">
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
						{t("introduce.section.how_it_works")}
					</h2>
					<p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
						{t("introduce.section.how_it_works_desc")}
					</p>
				</motion.div>

				{/* Steps */}
				<div className="relative">
					{/* Connection Line - Desktop */}
					<div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 -translate-y-1/2 z-0" />

					<div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 relative z-10">
						{steps.map((step, index) => (
							<motion.div
								key={step.number}
								initial={{ opacity: 0, y: 30 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ duration: 0.5, delay: index * 0.2 }}
								className="relative"
							>
								{/* Arrow for Mobile */}
								{index < steps.length - 1 && (
									<div className="lg:hidden flex justify-center my-4">
										<ArrowRight className="h-6 w-6 text-gray-400 rotate-90" />
									</div>
								)}

								<div className="flex flex-col items-center text-center">
									{/* Step Number & Icon */}
									<div className="relative mb-6">
										{/* Outer Glow Ring */}
										<div className={`absolute inset-0 bg-gradient-to-br ${step.gradient} rounded-full blur-lg opacity-30`} />

										{/* Main Circle */}
										<div className={`relative w-24 h-24 rounded-full bg-gradient-to-br ${step.gradient} flex items-center justify-center shadow-xl`}>
											<step.icon className="h-10 w-10 text-white" />
										</div>

										{/* Step Number Badge */}
										<div className="absolute -top-2 -right-2 w-8 h-8 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-lg border-2 border-gray-100 dark:border-gray-700">
											<span className="text-sm font-bold text-gray-900 dark:text-gray-100">
												{step.number}
											</span>
										</div>
									</div>

									{/* Content */}
									<h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
										{step.title}
									</h3>
									<p className="text-gray-600 dark:text-gray-400 max-w-xs">
										{step.description}
									</p>
								</div>
							</motion.div>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}
