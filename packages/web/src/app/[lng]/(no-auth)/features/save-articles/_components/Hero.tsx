"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { motion } from "framer-motion";
import { Heart, Sparkles } from "lucide-react";
import Link from "next/link";

interface HeroProps extends LanguageType {}

export default function Hero({ lng }: HeroProps) {
	const { t } = useTranslation(lng);

	return (
		<section className="relative py-20 lg:py-32 overflow-hidden">
			<div className="absolute inset-0 bg-gradient-to-br from-pink-50 via-white to-rose-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800" />

			<div className="relative mx-auto max-w-6xl px-4">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="text-center"
				>
					<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 mb-6">
						<Heart className="h-4 w-4" />
						<span className="text-sm font-medium">
							{t("features.saveArticles.hero.badge")}
						</span>
					</div>

					<h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-gray-100 mb-6">
						{t("features.saveArticles.hero.title")}
						<span className="block text-pink-500 mt-2">
							{t("features.saveArticles.hero.titleHighlight")}
						</span>
					</h1>

					<p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
						{t("features.saveArticles.hero.description")}
					</p>

					<div className="flex flex-col sm:flex-row items-center justify-center gap-4">
						<Link
							href="https://chromewebstore.google.com/detail/web-memo/eaiojpmgklfngpjddhoalgcpkepgkclh"
							target="_blank"
							className="inline-flex items-center gap-2 px-8 py-4 bg-pink-500 hover:bg-pink-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
						>
							<Sparkles className="h-5 w-5" />
							{t("features.saveArticles.hero.cta")}
						</Link>
						<Link
							href={`/${lng}/introduce`}
							className="inline-flex items-center gap-2 px-8 py-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 font-semibold rounded-xl transition-all duration-200"
						>
							{t("features.saveArticles.hero.learnMore")}
						</Link>
					</div>
				</motion.div>
			</div>
		</section>
	);
}
