"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { motion } from "framer-motion";
import { Pencil, BarChart3, FolderOpen, Sparkles, Heart } from "lucide-react";

interface FeaturesProps extends LanguageType {}

export default function Features({ lng }: FeaturesProps) {
	const { t } = useTranslation(lng);

	const features = [
		{
			icon: Pencil,
			title: t("introduce.features.memo.title"),
			description: t("introduce.features.memo.description"),
			color: "blue",
			gradient: "from-blue-500 to-cyan-500",
			iconBg: "bg-blue-500/10",
			iconColor: "text-blue-500",
			glowColor: "group-hover:shadow-blue-500/25",
			size: "large",
		},
		{
			icon: BarChart3,
			title: t("introduce.features.overview.title"),
			description: t("introduce.features.overview.description"),
			color: "green",
			gradient: "from-green-500 to-emerald-500",
			iconBg: "bg-green-500/10",
			iconColor: "text-green-500",
			glowColor: "group-hover:shadow-green-500/25",
			size: "small",
		},
		{
			icon: FolderOpen,
			title: t("introduce.features.organize.title"),
			description: t("introduce.features.organize.description"),
			color: "purple",
			gradient: "from-purple-500 to-pink-500",
			iconBg: "bg-purple-500/10",
			iconColor: "text-purple-500",
			glowColor: "group-hover:shadow-purple-500/25",
			size: "small",
		},
		{
			icon: Sparkles,
			title: t("introduce.features.ai_summary.title"),
			description: t("introduce.features.ai_summary.description"),
			color: "amber",
			gradient: "from-amber-500 to-orange-500",
			iconBg: "bg-amber-500/10",
			iconColor: "text-amber-500",
			glowColor: "group-hover:shadow-amber-500/25",
			size: "large",
		},
		{
			icon: Heart,
			title: t("introduce.features.wishlist.title"),
			description: t("introduce.features.wishlist.description"),
			color: "pink",
			gradient: "from-pink-500 to-rose-500",
			iconBg: "bg-pink-500/10",
			iconColor: "text-pink-500",
			glowColor: "group-hover:shadow-pink-500/25",
			size: "full",
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
									className={`relative h-full glass-card rounded-2xl p-8 transition-all duration-300 hover:shadow-xl ${feature.glowColor} hover:scale-[1.02] overflow-hidden`}
								>
									{/* Gradient Background on Hover */}
									<div
										className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
									/>

									{/* Content */}
									<div className="relative z-10">
										{/* Icon */}
										<div
											className={`inline-flex p-4 rounded-xl ${feature.iconBg} mb-6 transition-transform duration-300 group-hover:scale-110`}
										>
											<feature.icon className={`h-8 w-8 ${feature.iconColor}`} />
										</div>

										{/* Title */}
										<h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
											{feature.title}
										</h3>

										{/* Description */}
										<p className="text-gray-600 dark:text-gray-400 leading-relaxed">
											{feature.description}
										</p>
									</div>

									{/* Decorative Corner Gradient */}
									<div
										className={`absolute -bottom-20 -right-20 w-40 h-40 bg-gradient-to-br ${feature.gradient} opacity-10 rounded-full blur-3xl`}
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
