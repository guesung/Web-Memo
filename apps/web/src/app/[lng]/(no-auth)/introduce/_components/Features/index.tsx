"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { PATHS } from "@web-memo/shared/constants";
import { motion } from "framer-motion";
import {
	Pencil,
	BarChart3,
	FolderOpen,
	Sparkles,
	Heart,
	ArrowRight,
} from "lucide-react";
import Link from "next/link";

export interface FeaturesProps extends LanguageType {}

export default function Features({ lng }: FeaturesProps) {
	const { t } = useTranslation(lng);

	const features = [
		{
			icon: Pencil,
			title: t("introduce.features.memo.title"),
			description: t("introduce.features.memo.description"),
			color: "blue",
			gradient: "from-blue-500 to-cyan-500",
			iconBg: "bg-blue-500/10 dark:bg-blue-500/20",
			iconColor: "text-blue-600 dark:text-blue-400",
			glowColor: "group-hover:shadow-blue-500/25",
			borderGlow: "hover:border-blue-500/30",
			size: "large",
			href: `/${lng}${PATHS.featuresMemo}`,
		},
		{
			icon: BarChart3,
			title: t("introduce.features.overview.title"),
			description: t("introduce.features.overview.description"),
			color: "green",
			gradient: "from-green-500 to-emerald-500",
			iconBg: "bg-green-500/10 dark:bg-green-500/20",
			iconColor: "text-green-600 dark:text-green-400",
			glowColor: "group-hover:shadow-green-500/25",
			borderGlow: "hover:border-green-500/30",
			size: "small",
			href: null,
		},
		{
			icon: FolderOpen,
			title: t("introduce.features.organize.title"),
			description: t("introduce.features.organize.description"),
			color: "purple",
			gradient: "from-purple-500 to-pink-500",
			iconBg: "bg-purple-500/10 dark:bg-purple-500/20",
			iconColor: "text-purple-600 dark:text-purple-400",
			glowColor: "group-hover:shadow-purple-500/25",
			borderGlow: "hover:border-purple-500/30",
			size: "small",
			href: `/${lng}${PATHS.featuresSaveArticles}`,
		},
		{
			icon: Sparkles,
			title: t("introduce.features.ai_summary.title"),
			description: t("introduce.features.ai_summary.description"),
			color: "amber",
			gradient: "from-amber-500 to-orange-500",
			iconBg: "bg-amber-500/10 dark:bg-amber-500/20",
			iconColor: "text-amber-600 dark:text-amber-400",
			glowColor: "group-hover:shadow-amber-500/25",
			borderGlow: "hover:border-amber-500/30",
			size: "large",
			href: `/${lng}${PATHS.featuresYoutubeSummary}`,
		},
		{
			icon: Heart,
			title: t("introduce.features.wishlist.title"),
			description: t("introduce.features.wishlist.description"),
			color: "pink",
			gradient: "from-pink-500 to-rose-500",
			iconBg: "bg-pink-500/10 dark:bg-pink-500/20",
			iconColor: "text-pink-600 dark:text-pink-400",
			glowColor: "group-hover:shadow-pink-500/25",
			borderGlow: "hover:border-pink-500/30",
			size: "full",
			href: null,
		},
	];

	return (
		<section id="demo" className="py-24 relative overflow-hidden">
			{/* Background */}
			<div className="absolute inset-0 bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900" />
			<div className="absolute inset-0 bg-dots" />

			<div className="relative mx-auto max-w-6xl px-4">
				{/* Section Header */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5 }}
					className="text-center mb-16"
				>
					<motion.span
						initial={{ opacity: 0, scale: 0.9 }}
						whileInView={{ opacity: 1, scale: 1 }}
						viewport={{ once: true }}
						transition={{ duration: 0.5, delay: 0.1 }}
						className="inline-block mb-4 px-4 py-1.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium"
					>
						{t("introduce.section.features_badge") || "Features"}
					</motion.span>
					<h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4">
						{t("introduce.section.key_features")}
					</h2>
					<p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
						{t("introduce.section.key_features_desc")}
					</p>
				</motion.div>

				{/* Bento Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{features.map((feature, index) => {
						const gridClass =
							feature.size === "large"
								? "lg:col-span-2"
								: feature.size === "full"
									? "md:col-span-2 lg:col-span-3"
									: "";

						return (
							<motion.div
								key={feature.title}
								initial={{ opacity: 0, y: 30 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ duration: 0.5, delay: index * 0.1 }}
								className={`group relative ${gridClass}`}
							>
								<div
									className={`relative h-full bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-200/60 dark:border-gray-800 transition-all duration-300 hover:shadow-2xl ${feature.glowColor} ${feature.borderGlow} hover:-translate-y-1 overflow-hidden`}
								>
									{/* Gradient Background on Hover */}
									<div
										className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500`}
									/>

									{/* Content */}
									<div className="relative z-10">
										{/* Icon */}
										<div
											className={`inline-flex p-4 rounded-2xl ${feature.iconBg} mb-6 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg`}
										>
											<feature.icon
												className={`h-7 w-7 ${feature.iconColor}`}
											/>
										</div>

										{/* Title */}
										<h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
											{feature.title}
										</h3>

										{/* Description */}
										<p className="text-gray-600 dark:text-gray-400 leading-relaxed">
											{feature.description}
										</p>

										{feature.href && (
											<Link
												href={feature.href}
												className={`inline-flex items-center gap-1.5 mt-6 text-sm font-semibold ${feature.iconColor} transition-all group-hover:gap-2`}
											>
												{t("common.learn_more")}
												<ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
											</Link>
										)}
									</div>

									{/* Decorative Corner Gradient */}
									<div
										className={`absolute -bottom-24 -right-24 w-48 h-48 bg-gradient-to-br ${feature.gradient} opacity-[0.08] rounded-full blur-3xl transition-opacity duration-500 group-hover:opacity-[0.15]`}
									/>
								</div>
							</motion.div>
						);
					})}
				</div>
			</div>
		</section>
	);
}
