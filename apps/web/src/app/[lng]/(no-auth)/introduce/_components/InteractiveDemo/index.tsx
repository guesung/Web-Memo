"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { AnimatePresence, motion } from "framer-motion";
import {
	BarChart3,
	FolderOpen,
	Globe,
	Heart,
	Pencil,
	Sparkles,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

export interface InteractiveDemoProps extends LanguageType {}

export default function InteractiveDemo({ lng }: InteractiveDemoProps) {
	const { t } = useTranslation(lng);
	const [activeTab, setActiveTab] = useState(0);
	const [progress, setProgress] = useState(0);
	const [isPaused, setIsPaused] = useState(false);

	const tabs = [
		{
			id: "memo",
			icon: Pencil,
			label: t("introduce.demo.tab_memo"),
			description: t("introduce.demo.tab_memo_desc"),
			image: `/images/pngs/introduction/${lng}/1.png`,
			color: "blue",
		},
		{
			id: "overview",
			icon: BarChart3,
			label: t("introduce.demo.tab_overview"),
			description: t("introduce.demo.tab_overview_desc"),
			image: `/images/pngs/introduction/${lng}/2.png`,
			color: "green",
		},
		{
			id: "ai",
			icon: Sparkles,
			label: t("introduce.demo.tab_ai"),
			description: t("introduce.demo.tab_ai_desc"),
			image: `/images/pngs/introduction/${lng}/3.png`,
			color: "amber",
		},
		{
			id: "wishlist",
			icon: Heart,
			label: t("introduce.demo.tab_wishlist"),
			description: t("introduce.demo.tab_wishlist_desc"),
			image: `/images/pngs/introduction/${lng}/4.png`,
			color: "pink",
		},
		{
			id: "organize",
			icon: FolderOpen,
			label: t("introduce.demo.tab_organize"),
			description: t("introduce.demo.tab_organize_desc"),
			image: `/images/pngs/introduction/${lng}/5.png`,
			color: "purple",
		},
	];

	const AUTO_ROTATE_INTERVAL = 5000;

	const nextTab = useCallback(() => {
		setActiveTab((prev) => (prev + 1) % tabs.length);
		setProgress(0);
	}, [tabs.length]);

	useEffect(() => {
		if (isPaused) return;

		const progressInterval = setInterval(() => {
			setProgress((prev) => {
				if (prev >= 100) {
					nextTab();
					return 0;
				}
				return prev + 100 / (AUTO_ROTATE_INTERVAL / 100);
			});
		}, 100);

		return () => clearInterval(progressInterval);
	}, [isPaused, nextTab]);

	const handleTabClick = (index: number) => {
		setActiveTab(index);
		setProgress(0);
		setIsPaused(true);
		setTimeout(() => setIsPaused(false), 3000);
	};

	const getColorClasses = (color: string, _isActive: boolean) => {
		const colors: Record<
			string,
			{ bg: string; text: string; border: string; activeBg: string }
		> = {
			blue: {
				bg: "bg-blue-100 dark:bg-blue-900/30",
				text: "text-blue-600 dark:text-blue-400",
				border: "border-blue-500",
				activeBg: "bg-blue-500",
			},
			green: {
				bg: "bg-green-100 dark:bg-green-900/30",
				text: "text-green-600 dark:text-green-400",
				border: "border-green-500",
				activeBg: "bg-green-500",
			},
			amber: {
				bg: "bg-amber-100 dark:bg-amber-900/30",
				text: "text-amber-600 dark:text-amber-400",
				border: "border-amber-500",
				activeBg: "bg-amber-500",
			},
			pink: {
				bg: "bg-pink-100 dark:bg-pink-900/30",
				text: "text-pink-600 dark:text-pink-400",
				border: "border-pink-500",
				activeBg: "bg-pink-500",
			},
			purple: {
				bg: "bg-purple-100 dark:bg-purple-900/30",
				text: "text-purple-600 dark:text-purple-400",
				border: "border-purple-500",
				activeBg: "bg-purple-500",
			},
		};
		return colors[color];
	};

	return (
		<section id="demo" className="py-20 bg-white dark:bg-gray-900">
			<div className="mx-auto max-w-6xl px-4">
				{/* Section Header */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5 }}
					className="text-center mb-12"
				>
					<h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
						{t("introduce.section.demo")}
					</h2>
					<p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
						{t("introduce.section.demo_desc")}
					</p>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 30 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.6 }}
					onMouseEnter={() => setIsPaused(true)}
					onMouseLeave={() => setIsPaused(false)}
				>
					{/* Browser Mockup */}
					<div className="relative rounded-2xl overflow-hidden shadow-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
						{/* Browser Header */}
						<div className="flex items-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
							<div className="flex gap-1.5">
								<div className="w-3 h-3 rounded-full bg-red-500" />
								<div className="w-3 h-3 rounded-full bg-yellow-500" />
								<div className="w-3 h-3 rounded-full bg-green-500" />
							</div>
							<div className="flex-1 mx-4">
								<div className="bg-white dark:bg-gray-700 rounded-lg px-4 py-1.5 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 max-w-md mx-auto">
									<Globe className="h-4 w-4 flex-shrink-0" />
									<span className="truncate">webmemo.site</span>
								</div>
							</div>
						</div>

						{/* Screenshot Area */}
						<div className="relative aspect-[16/9] bg-gray-50 dark:bg-gray-800">
							<AnimatePresence mode="wait">
								<motion.div
									key={activeTab}
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
									transition={{ duration: 0.3 }}
									className="absolute inset-0"
								>
									<Image
										src={tabs[activeTab].image}
										alt={tabs[activeTab].label}
										fill
										sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1152px"
										className="object-contain"
										priority={activeTab === 0}
									/>
								</motion.div>
							</AnimatePresence>
						</div>

						{/* Tab Navigation */}
						<div className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
							<div className="flex flex-wrap justify-center gap-2 md:gap-4">
								{tabs.map((tab, index) => {
									const isActive = activeTab === index;
									const colors = getColorClasses(tab.color, isActive);

									return (
										<button
											key={tab.id}
											type="button"
											onClick={() => handleTabClick(index)}
											className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 ${
												isActive
													? `${colors.bg} ${colors.text} shadow-md`
													: "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
											}`}
										>
											<tab.icon className="h-5 w-5" />
											<span className="font-medium hidden sm:inline">
												{tab.label}
											</span>

											{/* Progress indicator for active tab */}
											{isActive && (
												<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
													<motion.div
														className={`h-full ${colors.activeBg}`}
														style={{ width: `${progress}%` }}
													/>
												</div>
											)}
										</button>
									);
								})}
							</div>

							{/* Active Tab Description */}
							<AnimatePresence mode="wait">
								<motion.p
									key={activeTab}
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -10 }}
									transition={{ duration: 0.2 }}
									className="text-center mt-4 text-gray-600 dark:text-gray-400"
								>
									{tabs[activeTab].description}
								</motion.p>
							</AnimatePresence>
						</div>
					</div>
				</motion.div>
			</div>
		</section>
	);
}
