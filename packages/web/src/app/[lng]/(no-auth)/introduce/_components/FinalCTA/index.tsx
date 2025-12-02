"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { URL } from "@web-memo/shared/constants";
import { motion } from "framer-motion";
import { ArrowRight, Check, Chrome } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface FinalCTAProps extends LanguageType {}

export default function FinalCTA({ lng }: FinalCTAProps) {
	const { t } = useTranslation(lng);

	const benefits = [
		t("introduce.hero.free_forever"),
		t("introduce.hero.no_credit_card"),
		t("introduce.hero.quick_install"),
	];

	return (
		<section className="py-20 relative overflow-hidden">
			{/* Gradient Background */}
			<div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600" />

			{/* Animated Background Elements */}
			<div className="absolute inset-0 overflow-hidden">
				<div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
				<div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
			</div>

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
						<h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
							{t("introduce.section.cta_title")}
						</h2>
						<p className="text-xl text-white/80 mb-8 max-w-lg">
							{t("introduce.section.cta_desc")}
						</p>

						{/* Benefits */}
						<div className="flex flex-wrap gap-4 mb-8 justify-center lg:justify-start">
							{benefits.map((benefit) => (
								<div
									key={benefit}
									className="flex items-center gap-2 text-white/90"
								>
									<div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
										<Check className="h-3 w-3 text-white" />
									</div>
									<span>{benefit}</span>
								</div>
							))}
						</div>

						{/* CTA Buttons */}
						<div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
							<Link
								href={URL.chromeStore}
								target="_blank"
								rel="noopener noreferrer"
								className="group inline-flex items-center justify-center gap-2.5 rounded-full bg-white px-8 py-4 text-lg font-semibold text-gray-900 shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]"
							>
								<Chrome className="h-5 w-5" />
								{t("introduce.hero.install_button")}
								<ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
							</Link>

							<Link
								href="#demo"
								className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-white/30 px-8 py-4 text-lg font-semibold text-white transition-all duration-300 hover:bg-white/10"
							>
								{t("introduce.hero.learn_more")}
							</Link>
						</div>
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
