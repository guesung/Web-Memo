import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.server";
import { URL } from "@web-memo/shared/constants";
import { Check, Chrome, Globe, Sparkles, Star, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { HeroAnimations } from "./HeroAnimations";

interface HeroProps extends LanguageType {}

export default async function Hero({ lng }: HeroProps) {
	const { t } = await useTranslation(lng);

	return (
		<section className="relative overflow-hidden min-h-[90vh] flex items-center">
			{/* Static Gradient Background */}
			<div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950" />
			<div className="absolute inset-0 gradient-mesh dark:gradient-mesh-dark opacity-5" />

			{/* Animated Background Elements - Client Component */}
			<HeroAnimations />

			{/* Grid Pattern Overlay */}
			<div className="absolute inset-0 bg-grid opacity-30 dark:opacity-10" />

			<div className="relative mx-auto max-w-6xl px-4 py-16 lg:py-24">
				<div className="grid lg:grid-cols-2 gap-12 items-center">
					{/* Left: Text Content - Server Rendered for LCP */}
					<div className="text-center lg:text-left">
						{/* Trust Badge */}
						<div className="mb-6 inline-flex items-center gap-3 rounded-full glass-card px-5 py-2.5 shadow-lg">
							<div className="flex items-center gap-1">
								{[...Array(5)].map((_, i) => (
									<Star
										key={i}
										className="h-4 w-4 fill-yellow-400 text-yellow-400"
									/>
								))}
							</div>
							<span className="font-semibold text-gray-900 dark:text-gray-100">
								5.0
							</span>
							<div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
							<div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
								<Users className="h-4 w-4" />
								<span>300+ users</span>
							</div>
						</div>

						{/* Main Headline - Critical LCP Element */}
						<h1 className="mb-6 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
							<span className="text-gray-900 dark:text-gray-100">
								{t("introduce.hero.title").split(" ")[0]}{" "}
							</span>
							<span className="gradient-text dark:gradient-text-dark">
								{t("introduce.hero.title").split(" ").slice(1).join(" ")}
							</span>
						</h1>

						{/* Subtitle */}
						<p className="mb-8 text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-xl mx-auto lg:mx-0">
							{t("introduce.hero.subtitle")}
						</p>

						{/* CTA Buttons */}
						<div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
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
								{t("introduce.hero.explore_features")}
							</Link>
						</div>

						{/* Additional Trust Signals */}
						<div className="mt-8 flex items-center gap-6 justify-center lg:justify-start text-sm text-gray-500 dark:text-gray-400">
							<div className="flex items-center gap-2">
								<Check className="h-4 w-4 text-green-500" />
								{t("introduce.hero.free_forever")}
							</div>
							<div className="flex items-center gap-2">
								<Check className="h-4 w-4 text-green-500" />
								{t("introduce.hero.quick_install")}
							</div>
						</div>
					</div>

					{/* Right: Browser Mockup */}
					<div className="relative hidden lg:block">
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
											<Globe className="h-4 w-4" />
											webmemo.site
										</div>
									</div>
								</div>

								{/* Screenshot */}
								<div className="relative aspect-[4/3]">
									<Image
										src={`/images/pngs/introduction/${lng}/1.png`}
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
					</div>
				</div>
			</div>
		</section>
	);
}
