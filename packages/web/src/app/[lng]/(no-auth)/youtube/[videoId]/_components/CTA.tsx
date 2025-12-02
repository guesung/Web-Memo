"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

interface CTAProps extends LanguageType {}

export default function CTA({ lng }: CTAProps) {
	const { t } = useTranslation(lng);

	return (
		<section className="rounded-xl bg-gradient-to-br from-red-500 to-orange-500 p-8 text-center">
			<div className="flex justify-center mb-4">
				<Sparkles className="h-10 w-10 text-white" />
			</div>
			<h2 className="text-2xl font-bold text-white mb-3">
				{t("youtube.summary.cta.title")}
			</h2>
			<p className="text-red-100 mb-6 max-w-lg mx-auto">
				{t("youtube.summary.cta.description")}
			</p>
			<Link
				href="https://chromewebstore.google.com/detail/web-memo/eaiojpmgklfngpjddhoalgcpkepgkclh"
				target="_blank"
				className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-gray-100 text-red-500 font-semibold rounded-xl transition-colors duration-200"
			>
				{t("youtube.summary.cta.button")}
				<ArrowRight className="h-5 w-5" />
			</Link>
		</section>
	);
}
