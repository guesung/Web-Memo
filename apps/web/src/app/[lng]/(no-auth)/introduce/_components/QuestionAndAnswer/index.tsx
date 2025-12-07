"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@web-memo/ui";
import { motion } from "framer-motion";
import { HelpCircle } from "lucide-react";

import { FAQ_ITEMS } from "../../_constants";
import FaqJsonLD from "./FaqJsonLD";

export default function QuestionAndAnswer({ lng }: LanguageType) {
	const { t } = useTranslation(lng);

	return (
		<section className="py-20 bg-gray-50 dark:bg-gray-900/50">
			<FaqJsonLD lng={lng} />
			<div className="mx-auto max-w-4xl px-4">
				{/* Section Header */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5 }}
					className="text-center mb-12"
				>
					<div className="inline-flex items-center justify-center p-3 rounded-xl bg-purple-100 dark:bg-purple-900/30 mb-4">
						<HelpCircle className="h-8 w-8 text-purple-600 dark:text-purple-400" />
					</div>
					<h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
						{t("introduce.faq.title")}
					</h2>
					<p className="text-lg text-gray-600 dark:text-gray-400">
						{t("introduce.faq.subtitle")}
					</p>
				</motion.div>

				{/* FAQ Accordion */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5, delay: 0.2 }}
				>
					<Accordion type="single" collapsible className="w-full space-y-4">
						{FAQ_ITEMS.map((faqItem, index) => (
							<motion.div
								key={faqItem}
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ duration: 0.3, delay: index * 0.1 }}
							>
								<AccordionItem
									value={faqItem}
									className="glass-card rounded-xl border-0 px-6 overflow-hidden"
								>
									<AccordionTrigger className="text-left font-semibold text-gray-900 dark:text-gray-100 hover:no-underline py-5">
										{t(`introduce.faq.questions.${faqItem}.question`)}
									</AccordionTrigger>
									<AccordionContent className="text-gray-600 dark:text-gray-400 pb-5 leading-relaxed">
										{t(`introduce.faq.questions.${faqItem}.answer`)}
									</AccordionContent>
								</AccordionItem>
							</motion.div>
						))}
					</Accordion>
				</motion.div>

				{/* Contact CTA */}
				<motion.div
					initial={{ opacity: 0 }}
					whileInView={{ opacity: 1 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5, delay: 0.5 }}
					className="text-center mt-12"
				>
					<p className="text-gray-600 dark:text-gray-400">
						{t("introduce.faq.other_questions")}{" "}
						<a
							href="mailto:pagers@kakao.com"
							className="text-purple-600 dark:text-purple-400 font-medium hover:underline"
						>
							{t("introduce.faq.contact_us")}
						</a>
					</p>
				</motion.div>
			</div>
		</section>
	);
}
