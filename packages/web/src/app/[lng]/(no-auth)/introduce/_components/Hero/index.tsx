"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { URL } from "@web-memo/shared/constants";
import { motion } from "framer-motion";
import Link from "next/link";

interface HeroProps extends LanguageType {}

export default function Hero({ lng }: HeroProps) {
	const { t } = useTranslation(lng);

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.6 }}
			className="mx-auto max-w-6xl text-center"
		>
			{/* Social Proof Badge */}
			<motion.div
				initial={{ opacity: 0, scale: 0.9 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 0.5, delay: 0.2 }}
				className="mb-8 inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-3 text-lg dark:from-gray-800/50 dark:to-gray-700/50"
			>
				<div className="flex">
					{"★★★★★".split("").map((star) => (
						<span key={star} className="text-yellow-400">
							{star}
						</span>
					))}
				</div>
				<span className="font-semibold text-gray-900 dark:text-gray-100">
					5.0
				</span>
				<span className="text-gray-600 dark:text-gray-400">100+ users</span>
				<span className="ml-2 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
					{lng === "ko" ? "무료" : "Free"}
				</span>
			</motion.div>

			{/* Main Headline */}
			<motion.h1
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5, delay: 0.3 }}
				className="mb-6 text-6xl font-bold text-gray-900 dark:text-gray-100 md:text-7xl"
			>
				{t("introduce.hero.title")}
			</motion.h1>

			{/* Enhanced Subtitle */}
			<motion.p
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5, delay: 0.4 }}
				className="mb-8 text-xl text-gray-600 dark:text-gray-400 md:text-2xl"
			>
				{t("introduce.hero.subtitle")}
			</motion.p>

			{/* Key Benefits */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5, delay: 0.5 }}
				className="mb-12 grid grid-cols-1 gap-4 md:grid-cols-3"
			>
				<div className="flex items-center justify-center gap-2 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
					<svg
						className="h-5 w-5 text-blue-600"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M13 10V3L4 14h7v7l9-11h-7z"
						/>
					</svg>
					<span className="text-sm font-medium text-blue-800 dark:text-blue-400">
						{lng === "ko" ? "1초 만에 메모" : "Memo in 1 second"}
					</span>
				</div>
				<div className="flex items-center justify-center gap-2 rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
					<svg
						className="h-5 w-5 text-green-600"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
						/>
					</svg>
					<span className="text-sm font-medium text-green-800 dark:text-green-400">
						{lng === "ko" ? "AI 자동 요약" : "AI Auto Summary"}
					</span>
				</div>
				<div className="flex items-center justify-center gap-2 rounded-lg bg-purple-50 p-4 dark:bg-purple-900/20">
					<svg
						className="h-5 w-5 text-purple-600"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
						/>
					</svg>
					<span className="text-sm font-medium text-purple-800 dark:text-purple-400">
						{lng === "ko" ? "체계적 정리" : "Organized Storage"}
					</span>
				</div>
			</motion.div>

			{/* Enhanced CTA Section */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5, delay: 0.6 }}
				className="mb-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
			>
				<Link
					href={URL.chromeStore}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:scale-105"
				>
					<img src="/images/pngs/chrome.png" alt="Chrome" className="h-6 w-6" />
					{t("introduce.hero.install_button")}
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
							d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
						/>
					</svg>
				</Link>
				<Link
					href={`/${lng}/demo`}
					className="inline-flex items-center gap-2 rounded-full border-2 border-gray-300 px-8 py-4 text-lg font-semibold text-gray-700 transition-all hover:border-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:bg-gray-800"
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
				</Link>
			</motion.div>

			{/* Trust Indicators */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5, delay: 0.7 }}
				className="flex flex-col items-center gap-4 text-sm text-gray-500 dark:text-gray-400"
			>
				<div className="flex items-center gap-6">
					<div className="flex items-center gap-2">
						<svg
							className="h-4 w-4 text-green-500"
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
						<span>{lng === "ko" ? "무료 사용" : "Free to use"}</span>
					</div>
					<div className="flex items-center gap-2">
						<svg
							className="h-4 w-4 text-blue-500"
							fill="currentColor"
							viewBox="0 0 20 20"
							aria-hidden="true"
						>
							<path
								fillRule="evenodd"
								d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
								clipRule="evenodd"
							/>
						</svg>
						<span>{lng === "ko" ? "개인정보 보호" : "Privacy Protected"}</span>
					</div>
					<div className="flex items-center gap-2">
						<svg
							className="h-4 w-4 text-purple-500"
							fill="currentColor"
							viewBox="0 0 20 20"
							aria-hidden="true"
						>
							<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<span>{lng === "ko" ? "데이터 백업" : "Data Backup"}</span>
					</div>
				</div>
			</motion.div>
		</motion.div>
	);
}
