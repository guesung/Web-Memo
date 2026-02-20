import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.server";
import { Sparkles, Youtube } from "lucide-react";
import Link from "next/link";

interface HeroProps extends LanguageType {}

export default async function Hero({ lng }: HeroProps) {
	const { t } = await useTranslation(lng);

	return (
		<section className="relative py-20 lg:py-32 overflow-hidden">
			<div className="absolute inset-0 bg-gradient-to-br from-red-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800" />

			<div className="relative mx-auto max-w-6xl px-4">
				<div className="text-center">
					<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 mb-6">
						<Youtube className="h-4 w-4" />
						<span className="text-sm font-medium">
							{t("useCases.youtubeNotes.hero.badge")}
						</span>
					</div>

					<h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-gray-100 mb-6">
						{t("useCases.youtubeNotes.hero.title")}
						<span className="block text-red-500 mt-2">
							{t("useCases.youtubeNotes.hero.titleHighlight")}
						</span>
					</h1>

					<p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
						{t("useCases.youtubeNotes.hero.description")}
					</p>

					<div className="flex flex-col sm:flex-row items-center justify-center gap-4">
						<Link
							href="https://chromewebstore.google.com/detail/web-memo/eaiojpmgklfngpjddhoalgcpkepgkclh"
							target="_blank"
							className="inline-flex items-center gap-2 px-8 py-4 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
						>
							<Sparkles className="h-5 w-5" />
							{t("useCases.youtubeNotes.hero.cta")}
						</Link>
						<Link
							href={`/${lng}/introduce`}
							className="inline-flex items-center gap-2 px-8 py-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 font-semibold rounded-xl transition-all duration-200"
						>
							{t("useCases.youtubeNotes.hero.learnMore")}
						</Link>
					</div>
				</div>
			</div>
		</section>
	);
}
