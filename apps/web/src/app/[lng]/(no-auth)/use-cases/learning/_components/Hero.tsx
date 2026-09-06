import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.server";
import { GraduationCap, Sparkles } from "lucide-react";
import Link from "next/link";

interface HeroProps extends LanguageType {}

export default async function Hero({ lng }: HeroProps) {
	const { t } = await useTranslation(lng);

	return (
		<section className="relative py-20 lg:py-32 overflow-hidden">
			<div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-background to-purple-50 dark:from-background dark:via-background dark:to-muted" />

			<div className="relative mx-auto max-w-6xl px-4">
				<div className="text-center">
					<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 mb-6">
						<GraduationCap className="h-4 w-4" />
						<span className="text-sm font-medium">
							{t("useCases.learning.hero.badge")}
						</span>
					</div>

					<h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6">
						{t("useCases.learning.hero.title")}
						<span className="block text-indigo-500 mt-2">
							{t("useCases.learning.hero.titleHighlight")}
						</span>
					</h1>

					<p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
						{t("useCases.learning.hero.description")}
					</p>

					<div className="flex flex-col sm:flex-row items-center justify-center gap-4">
						<Link
							href="https://chromewebstore.google.com/detail/web-memo/eaiojpmgklfngpjddhoalgcpkepgkclh"
							target="_blank"
							className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
						>
							<Sparkles className="h-5 w-5" />
							{t("useCases.learning.hero.cta")}
						</Link>
						<Link
							href={`/${lng}/introduce`}
							className="inline-flex items-center gap-2 px-8 py-4 bg-secondary text-secondary-foreground hover:bg-secondary/80 font-semibold rounded-xl transition-all duration-200"
						>
							{t("useCases.learning.hero.learnMore")}
						</Link>
					</div>
				</div>
			</div>
		</section>
	);
}
