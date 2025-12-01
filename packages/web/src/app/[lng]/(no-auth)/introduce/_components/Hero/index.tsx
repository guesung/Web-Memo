"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { URL } from "@web-memo/shared/constants";
import { motion } from "framer-motion";
import { Chrome, Star, Users, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface HeroProps extends LanguageType {}

export default function Hero({ lng }: HeroProps) {
	const { t } = useTranslation(lng);

	return (
		<section className="relative overflow-hidden">
			{/* Gradient Background */}
			<div className="absolute inset-0 gradient-mesh dark:gradient-mesh-dark opacity-10" />

			{/* Background Decorative Elements */}
			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				<div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
				<div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
				<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
			</div>

			<div className="relative mx-auto max-w-6xl px-4 py-16 lg:py-24">
				<div className="grid lg:grid-cols-2 gap-12 items-center">
					{/* Left: Text Content */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6 }}
						className="text-center lg:text-left"
					>
						{/* Trust Badge */}
						<motion.div
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ duration: 0.5, delay: 0.2 }}
							className="mb-6 inline-flex items-center gap-3 rounded-full glass-card px-5 py-2.5 shadow-lg"
						>
							<div className="flex items-center gap-1">
								{[...Array(5)].map((_, i) => (
									<Star
										key={i}
										className="h-4 w-4 fill-yellow-400 text-yellow-400"
									/>
								))}
							</div>
							<span className="font-semibold text-gray-900 dark:text-gray-100">5.0</span>
							<div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
							<div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
								<Users className="h-4 w-4" />
								<span>250+ users</span>
							</div>
						</motion.div>

						{/* Main Headline */}
						<motion.h1
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, delay: 0.3 }}
							className="mb-6 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight"
						>
							<span className="text-gray-900 dark:text-gray-100">
								{t("introduce.hero.title").split(" ")[0]}{" "}
							</span>
							<span className="gradient-text dark:gradient-text-dark">
								{t("introduce.hero.title").split(" ").slice(1).join(" ")}
							</span>
						</motion.h1>

						{/* Subtitle */}
						<motion.p
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, delay: 0.4 }}
							className="mb-8 text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-xl mx-auto lg:mx-0"
						>
							{t("introduce.hero.subtitle")}
						</motion.p>

						{/* CTA Buttons */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, delay: 0.5 }}
							className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
						>
							{/* Primary CTA */}
							<Link
								href={URL.chromeStore}
								target="_blank"
								rel="noopener noreferrer"
								className="group relative inline-flex items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] overflow-hidden"
							>
								<span className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity" />
								<Chrome className="h-5 w-5" />
								{t("introduce.hero.install_button")}
							</Link>

							{/* Secondary CTA */}
							<Link
								href="#demo"
								className="inline-flex items-center justify-center gap-2 rounded-full glass-card px-8 py-4 text-lg font-semibold text-gray-800 dark:text-gray-100 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
							>
								<Sparkles className="h-5 w-5" />
								{lng === "ko" ? "기능 살펴보기" : "Explore Features"}
							</Link>
						</motion.div>

						{/* Additional Trust Signals */}
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ duration: 0.5, delay: 0.7 }}
							className="mt-8 flex items-center gap-6 justify-center lg:justify-start text-sm text-gray-500 dark:text-gray-400"
						>
							<div className="flex items-center gap-2">
								<svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
									<path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
								</svg>
								{lng === "ko" ? "영원히 무료" : "Free Forever"}
							</div>
							<div className="flex items-center gap-2">
								<svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
									<path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
								</svg>
								{lng === "ko" ? "설치 10초" : "10s Install"}
							</div>
						</motion.div>
					</motion.div>

					{/* Right: Browser Mockup */}
					<motion.div
						initial={{ opacity: 0, x: 50 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.8, delay: 0.3 }}
						className="relative hidden lg:block"
					>
						<div className="animate-float">
							{/* Browser Frame */}
							<div className="relative rounded-2xl overflow-hidden shadow-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
								{/* Browser Header */}
								<div className="flex items-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
									<div className="flex gap-1.5">
										<div className="w-3 h-3 rounded-full bg-red-500" />
										<div className="w-3 h-3 rounded-full bg-yellow-500" />
										<div className="w-3 h-3 rounded-full bg-green-500" />
									</div>
									<div className="flex-1 mx-4">
										<div className="bg-white dark:bg-gray-700 rounded-lg px-4 py-1.5 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
											<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
											</svg>
											web-memo.site
										</div>
									</div>
								</div>

								{/* Screenshot */}
								<div className="relative aspect-[4/3]">
									<Image
										src={`/images/introduce/${lng}/1.png`}
										alt="Web Memo Screenshot"
										fill
										className="object-cover object-top"
										priority
									/>
								</div>
							</div>

							{/* Decorative Glow */}
							<div className="absolute -inset-4 bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-cyan-500/20 rounded-3xl blur-2xl -z-10" />
						</div>
					</motion.div>
				</div>
			</div>
		</section>
	);
}
