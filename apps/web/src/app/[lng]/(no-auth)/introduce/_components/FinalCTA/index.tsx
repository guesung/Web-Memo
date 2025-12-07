"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { URL } from "@web-memo/shared/constants";
import { motion } from "framer-motion";
import { ArrowRight, Check, Chrome, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export interface FinalCTAProps extends LanguageType {}

export default function FinalCTA({ lng }: FinalCTAProps) {
	const { t } = useTranslation(lng);

	const benefits = [
		t("introduce.hero.free_forever"),
		t("introduce.hero.no_credit_card"),
		t("introduce.hero.quick_install"),
	];

	return (
		<section className="py-24 relative overflow-hidden">
			{/* Gradient Background */}
			<div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500" />

			{/* Animated Background Elements */}
			<div className="absolute inset-0 overflow-hidden">
				<motion.div
					animate={{
						scale: [1, 1.2, 1],
						opacity: [0.1, 0.2, 0.1],
					}}
					transition={{
						duration: 8,
						repeat: Number.POSITIVE_INFINITY,
						ease: "easeInOut",
					}}
					className="absolute -top-40 -right-40 w-96 h-96 bg-white/20 rounded-full blur-3xl"
				/>
				<motion.div
					animate={{
						scale: [1.2, 1, 1.2],
						opacity: [0.1, 0.2, 0.1],
					}}
					transition={{
						duration: 10,
						repeat: Number.POSITIVE_INFINITY,
						ease: "easeInOut",
					}}
					className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/20 rounded-full blur-3xl"
				/>
				<motion.div
					animate={{
						x: [0, 30, 0],
						y: [0, -20, 0],
					}}
					transition={{
						duration: 12,
						repeat: Number.POSITIVE_INFINITY,
						ease: "easeInOut",
					}}
					className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-400/10 rounded-full blur-3xl"
				/>
			</div>

			{/* Noise Overlay */}
			<div className="absolute inset-0 bg-grid opacity-10" />

			<div className="relative mx-auto max-w-6xl px-4">
				<div className="grid lg:grid-cols-2 gap-12 items-center">
					{/* Left: Content */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.5 }}
						className="text-center lg:text-left"
					>
						{/* Badge */}
						<motion.div
							initial={{ opacity: 0, scale: 0.9 }}
							whileInView={{ opacity: 1, scale: 1 }}
							viewport={{ once: true }}
							transition={{ duration: 0.5, delay: 0.1 }}
							className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20"
						>
							<Sparkles className="h-4 w-4 text-yellow-300" />
							<span className="text-sm font-medium text-white">
								{t("introduce.section.cta_badge") || "Get Started Today"}
							</span>
						</motion.div>

						<h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
							{t("introduce.section.cta_title")}
						</h2>
						<p className="text-xl text-white/80 mb-8 max-w-lg mx-auto lg:mx-0">
							{t("introduce.section.cta_desc")}
						</p>

						{/* Benefits */}
						<div className="flex flex-wrap gap-4 mb-8 justify-center lg:justify-start">
							{benefits.map((benefit, index) => (
								<motion.div
									key={benefit}
									initial={{ opacity: 0, x: -10 }}
									whileInView={{ opacity: 1, x: 0 }}
									viewport={{ once: true }}
									transition={{ duration: 0.3, delay: 0.2 + index * 0.1 }}
									className="flex items-center gap-2.5 text-white"
								>
									<div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
										<Check className="h-3.5 w-3.5 text-white" />
									</div>
									<span className="font-medium">{benefit}</span>
								</motion.div>
							))}
						</div>

						{/* CTA Buttons */}
						<motion.div
							initial={{ opacity: 0, y: 10 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.5, delay: 0.4 }}
							className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
						>
							<Link
								href={URL.chromeStore}
								target="_blank"
								rel="noopener noreferrer"
								className="group relative inline-flex items-center justify-center gap-2.5 rounded-full bg-white px-8 py-4 text-lg font-semibold text-gray-900 shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] overflow-hidden"
							>
								<span className="absolute inset-0 bg-gradient-to-r from-yellow-100/0 via-yellow-100/50 to-yellow-100/0 shimmer opacity-0 group-hover:opacity-100" />
								<Chrome className="h-5 w-5 text-blue-600" />
								{t("introduce.hero.install_button")}
								<ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
							</Link>

							<Link
								href="#demo"
								className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-white/30 backdrop-blur-sm px-8 py-4 text-lg font-semibold text-white transition-all duration-300 hover:bg-white/10 hover:border-white/50"
							>
								{t("introduce.hero.learn_more")}
							</Link>
						</motion.div>
					</motion.div>

					{/* Right: Floating Mockup */}
					<motion.div
						initial={{ opacity: 0, x: 50 }}
						whileInView={{ opacity: 1, x: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.8, delay: 0.2 }}
						className="relative hidden lg:block"
					>
						<div className="animate-float">
							{/* Browser Frame */}
							<div className="relative rounded-2xl overflow-hidden shadow-2xl bg-white/10 backdrop-blur-sm border border-white/20">
								{/* Browser Header */}
								<div className="flex items-center gap-2 px-4 py-3 bg-black/20 border-b border-white/10">
									<div className="flex gap-1.5">
										<div className="w-3 h-3 rounded-full bg-white/30" />
										<div className="w-3 h-3 rounded-full bg-white/30" />
										<div className="w-3 h-3 rounded-full bg-white/30" />
									</div>
								</div>

								{/* Screenshot */}
								<div className="relative aspect-[4/3]">
									<Image
										src={`/images/pngs/introduction/${lng}/1.png`}
										alt="Web Memo Screenshot"
										fill
										sizes="(max-width: 1024px) 0vw, 50vw"
										loading="lazy"
										className="object-cover object-top opacity-90"
									/>
								</div>
							</div>

							{/* Decorative Glow */}
							<div className="absolute -inset-4 bg-white/10 rounded-3xl blur-2xl -z-10" />
						</div>
					</motion.div>
				</div>
			</div>
		</section>
	);
}
