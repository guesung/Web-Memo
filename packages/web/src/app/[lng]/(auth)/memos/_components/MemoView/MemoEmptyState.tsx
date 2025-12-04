"use client";

import type { LanguageType } from "@src/modules/i18n";
import { URL } from "@web-memo/shared/constants";
import { isMac } from "@web-memo/shared/utils";
import { Button } from "@web-memo/ui";
import { motion } from "framer-motion";
import { BookOpen, Chrome, Keyboard, MousePointer, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";

interface MemoEmptyStateProps extends LanguageType {}

export default function MemoEmptyState({ lng }: MemoEmptyStateProps) {
	const { t } = useTranslation(lng);

	const tips = [
		{ icon: MousePointer, text: t("memos.emptyState.tip1") },
		{
			icon: Keyboard,
			text: t("memos.emptyState.tip2", { key: isMac() ? "Option" : "Alt" }),
		},
		{ icon: Zap, text: t("memos.emptyState.tip3") },
	];

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			className="flex flex-col items-center justify-center min-h-[60vh] px-4"
		>
			<div className="relative mb-8">
				<div className="absolute inset-0 flex items-center justify-center">
					<div className="w-48 h-48 rounded-full bg-purple-500/10 animate-pulse" />
				</div>
				<div className="absolute inset-0 flex items-center justify-center">
					<motion.div
						className="w-32 h-32 rounded-full bg-blue-500/10"
						animate={{ scale: [1, 1.1, 1] }}
						transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, delay: 0.5 }}
					/>
				</div>

				<div className="relative z-10 w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-2xl">
					<Sparkles className="h-12 w-12 text-white" />
				</div>
			</div>

			<h3 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-4 text-center">
				{t("memos.emptyState.title")}
			</h3>

			<p className="text-lg text-gray-600 dark:text-gray-400 mb-8 text-center max-w-md">
				{t("memos.emptyState.message")}
			</p>

			<div className="flex flex-col sm:flex-row gap-4">
				<Button
					size="lg"
					className="h-14 px-8 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
					asChild
				>
					<Link href={URL.chromeStore} target="_blank" rel="noopener noreferrer">
						<Chrome className="h-5 w-5 mr-2" />
						{t("memos.emptyState.installExtension")}
					</Link>
				</Button>

				<Button
					variant="outline"
					size="lg"
					className="h-14 px-8 border-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
					asChild
				>
					<Link href={`/${lng}/introduce`}>
						<BookOpen className="h-5 w-5 mr-2" />
						{t("memos.emptyState.learnHow")}
					</Link>
				</Button>
			</div>

			<div className="mt-12 grid sm:grid-cols-3 gap-6 max-w-3xl">
				{tips.map((tip, index) => (
					<motion.div
						key={index}
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.3 + index * 0.1 }}
						className="flex flex-col items-center text-center"
					>
						<div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
							<tip.icon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
						</div>
						<p className="text-sm text-gray-600 dark:text-gray-400">{tip.text}</p>
					</motion.div>
				))}
			</div>
		</motion.div>
	);
}
