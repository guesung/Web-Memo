"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

interface CTAProps extends LanguageType {}

export default function CTA({ lng }: CTAProps) {
	const { t } = useTranslation(lng);

	return (
		<section className="py-20 bg-gradient-to-br from-emerald-500 to-teal-500">
			<div className="mx-auto max-w-4xl px-4">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5 }}
					className="text-center"
				>
					<h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
						{t("useCases.developer.cta.title")}
					</h2>
					<p className="text-lg text-emerald-100 mb-8 max-w-2xl mx-auto">
						{t("useCases.developer.cta.description")}
					</p>

					<Link
						href="https://chromewebstore.google.com/detail/web-memo/eaiojpmgklfngpjddhoalgcpkepgkclh"
						target="_blank"
						className="inline-flex items-center gap-2 px-8 py-4 bg-white hover:bg-gray-100 text-emerald-500 font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
					>
						{t("useCases.developer.cta.button")}
						<ArrowRight className="h-5 w-5" />
					</Link>

					<p className="mt-4 text-sm text-emerald-100">
						{t("useCases.developer.cta.subtext")}
					</p>
				</motion.div>
			</div>
		</section>
	);
}
