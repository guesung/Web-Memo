"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { motion } from "framer-motion";

interface AdditionalFeaturesProps extends LanguageType {}

const fadeInUp = {
	initial: { opacity: 0, y: 20 },
	animate: { opacity: 1, y: 0 },
	transition: { duration: 0.5 },
};

const staggerContainer = {
	animate: {
		transition: {
			staggerChildren: 0.1,
		},
	},
};

export default function AdditionalFeatures({ lng }: AdditionalFeaturesProps) {
	const { t } = useTranslation(lng);

	const features = [
		{
			icon: (
				<svg
					aria-label="ai_summary"
					aria-hidden="true"
					className="h-6 w-6 text-yellow-600"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
					/>
				</svg>
			),
			title: t("introduce.features.ai_summary.title"),
			description: t("introduce.features.ai_summary.description"),
			color: "yellow",
			highlight:
				lng === "ko"
					? "AI가 핵심 내용을 자동으로 추출"
					: "AI automatically extracts key content",
		},
		{
			icon: (
				<svg
					aria-label="wishlist"
					aria-hidden="true"
					className="h-6 w-6 text-pink-600"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
					/>
				</svg>
			),
			title: t("introduce.features.wishlist.title"),
			description: t("introduce.features.wishlist.description"),
			color: "pink",
			highlight:
				lng === "ko"
					? "나중에 볼 내용을 안전하게 보관"
					: "Safely store content for later viewing",
		},
		{
			icon: (
				<svg
					aria-label="shortcuts"
					aria-hidden="true"
					className="h-6 w-6 text-blue-600"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M13 10V3L4 14h7v7l9-11h-7z"
					/>
				</svg>
			),
			title: t("introduce.features.shortcuts.title"),
			description: t("introduce.features.shortcuts.description"),
			color: "blue",
			highlight:
				lng === "ko"
					? "생산성 향상을 위한 빠른 접근"
					: "Quick access for productivity boost",
		},
		{
			icon: (
				<svg
					aria-label="export"
					aria-hidden="true"
					className="h-6 w-6 text-green-600"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					/>
				</svg>
			),
			title: t("introduce.features.export.title"),
			description: t("introduce.features.export.description"),
			color: "green",
			highlight:
				lng === "ko"
					? "데이터 영구 보존 및 백업"
					: "Permanent data preservation and backup",
		},
		{
			icon: (
				<svg
					aria-label="privacy"
					aria-hidden="true"
					className="h-6 w-6 text-purple-600"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
					/>
				</svg>
			),
			title: t("introduce.features.privacy.title"),
			description: t("introduce.features.privacy.description"),
			color: "purple",
			highlight:
				lng === "ko" ? "완전한 개인정보 보호" : "Complete privacy protection",
		},
		{
			icon: (
				<svg
					aria-label="sync"
					aria-hidden="true"
					className="h-6 w-6 text-indigo-600"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
					/>
				</svg>
			),
			title: t("introduce.features.sync.title"),
			description: t("introduce.features.sync.description"),
			color: "indigo",
			highlight:
				lng === "ko" ? "언제 어디서나 접근 가능" : "Access anywhere, anytime",
		},
	];

	return (
		<section className="py-16">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.6 }}
				className="mx-auto max-w-6xl px-4"
			>
				<div className="text-center mb-12">
					<h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
						{lng === "ko" ? "더 많은 기능들" : "More Features"}
					</h2>
					<p className="text-lg text-gray-600 dark:text-gray-400">
						{lng === "ko"
							? "웹 메모는 단순한 메모 도구를 넘어서는 강력한 생산성 도구입니다"
							: "Web Memo is more than just a memo tool - it's a powerful productivity tool"}
					</p>
				</div>

				<motion.div
					variants={staggerContainer}
					initial="initial"
					animate="animate"
					className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
				>
					{features.map((feature, index) => (
						<motion.div
							key={feature.title}
							variants={fadeInUp}
							className="group relative rounded-xl bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-105 dark:bg-gray-800"
						>
							<div
								className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-${feature.color}-100 group-hover:bg-${feature.color}-200 transition-colors`}
							>
								{feature.icon}
							</div>
							<h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
								{feature.title}
							</h3>
							<p className="mb-3 text-gray-600 dark:text-gray-400">
								{feature.description}
							</p>
							<div className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
								<svg
									className="h-3 w-3"
									fill="currentColor"
									viewBox="0 0 20 20"
									aria-hidden="true"
								>
									<path
										fillRule="evenodd"
										d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
										clipRule="evenodd"
									/>
								</svg>
								{feature.highlight}
							</div>
						</motion.div>
					))}
				</motion.div>

				{/* Call to Action */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 0.3 }}
					className="mt-12 text-center"
				>
					<div className="rounded-2xl bg-gradient-to-r from-blue-50 to-purple-50 p-8 dark:from-gray-800/50 dark:to-gray-700/50">
						<h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
							{lng === "ko" ? "지금 시작해보세요" : "Start Now"}
						</h3>
						<p className="text-gray-600 dark:text-gray-400 mb-6">
							{lng === "ko"
								? "100+ 사용자가 이미 웹 메모를 선택했습니다. 당신도 지금 시작해보세요!"
								: "100+ users have already chosen Web Memo. Start yours now!"}
						</p>
						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							<a
								href={
									lng === "ko"
										? "https://chrome.google.com/webstore/detail/web-memo"
										: "https://chrome.google.com/webstore/detail/web-memo"
								}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 text-white font-semibold transition-all hover:shadow-lg hover:scale-105"
							>
								<img
									src="/images/pngs/chrome.png"
									alt="Chrome"
									className="h-5 w-5"
								/>
								{lng === "ko" ? "크롬에 설치하기" : "Add to Chrome"}
							</a>
							<a
								href={`/${lng}/demo`}
								className="inline-flex items-center gap-2 rounded-full border-2 border-gray-300 px-6 py-3 text-gray-700 font-semibold transition-all hover:border-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:bg-gray-800"
							>
								<svg
									className="h-5 w-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									aria-hidden="true"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
								{lng === "ko" ? "데모 보기" : "View Demo"}
							</a>
						</div>
					</div>
				</motion.div>
			</motion.div>
		</section>
	);
}
