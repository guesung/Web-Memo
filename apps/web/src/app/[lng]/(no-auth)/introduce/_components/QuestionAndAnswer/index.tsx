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

interface IFQuestionAndAnswerProps extends LanguageType {
	background?: TSectionBackground;
}

/** 번역된 FAQ를 화면과 구조화 데이터에 함께 표시합니다. */
const QuestionAndAnswer = ({ lng, background }: IFQuestionAndAnswerProps) => {
	const { t } = useTranslation(lng);
	const faqItems = FAQ_ITEMS.map((key) => ({
		key,
		question: t(`introduce.faq.questions.${key}.question`),
		answer: t(`introduce.faq.questions.${key}.answer`),
	}));

	return (
		<SectionShell background={background} className="max-w-3xl">
			<FaqJsonLD items={faqItems} />

			<SectionHeader
				title={t("introduce.faq.title")}
				description={t("introduce.faq.subtitle")}
			/>

			<Accordion
				type="single"
				collapsible
				className="w-full border-t border-border"
			>
				{faqItems.map((faqItem) => (
					<AccordionItem
						key={faqItem.key}
						value={faqItem.key}
						className="border-border"
					>
						<AccordionTrigger className="py-6 text-left text-lg tracking-[-0.015em] hover:no-underline">
							{faqItem.question}
						</AccordionTrigger>
						<AccordionContent className="pb-6 leading-relaxed text-muted-foreground">
							{faqItem.answer}
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
};

export default QuestionAndAnswer;
