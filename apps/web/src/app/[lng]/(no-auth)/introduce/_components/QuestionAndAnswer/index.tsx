"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { EXTERNAL_LINK } from "@web-memo/shared/constants";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@web-memo/ui";

import { FAQ_ITEMS } from "../../_constants";
import SectionHeader from "../SectionHeader";
import SectionShell, { type TSectionBackground } from "../SectionShell";
import FaqJsonLD from "./FaqJsonLD";

/**
 * 자주 묻는 질문.
 * @description
 * 접기·펼치기는 Radix 아코디언 그대로 두고 시각만 정리했다. 카드 대신 hairline
 * 구분선으로 항목을 나눈다.
 */

interface QuestionAndAnswerProps extends LanguageType {
	background?: TSectionBackground;
}

export default function QuestionAndAnswer({
	lng,
	background,
}: QuestionAndAnswerProps) {
	const { t } = useTranslation(lng);

	return (
		<SectionShell background={background} className="max-w-3xl">
			<FaqJsonLD lng={lng} />

			<SectionHeader
				title={t("introduce.faq.title")}
				description={t("introduce.faq.subtitle")}
			/>

			<Accordion
				type="single"
				collapsible
				className="w-full border-t border-border"
			>
				{FAQ_ITEMS.map((faqItem) => (
					<AccordionItem
						key={faqItem}
						value={faqItem}
						className="border-border"
					>
						<AccordionTrigger className="py-6 text-left text-lg tracking-[-0.015em] hover:no-underline">
							{t(`introduce.faq.questions.${faqItem}.question`)}
						</AccordionTrigger>
						<AccordionContent className="pb-6 leading-relaxed text-muted-foreground">
							{t(`introduce.faq.questions.${faqItem}.answer`)}
						</AccordionContent>
					</AccordionItem>
				))}
			</Accordion>

			<p className="mt-12 text-center text-muted-foreground">
				{t("introduce.faq.other_questions")}{" "}
				<a
					href={EXTERNAL_LINK.contactEmail}
					className="text-foreground underline underline-offset-4"
				>
					{t("introduce.faq.contact_us")}
				</a>
			</p>
		</SectionShell>
	);
}
