'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@extension/ui';
import { FAQ_ITEMS } from '@src/constants';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';
import { motion } from 'framer-motion';

export default function QuestionAndAnswer({ lng }: LanguageType) {
  const { t } = useTranslation(lng);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
      className="mx-auto mt-24 max-w-4xl">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        viewport={{ once: true }}
        className="mb-8 text-center text-3xl font-bold">
        {t('introduce.faq.title')}
      </motion.h2>
      <Accordion type="single" collapsible className="w-full">
        {FAQ_ITEMS.map(faqItem => (
          <AccordionItem key={faqItem} value={faqItem}>
            <AccordionTrigger>{t(`introduce.faq.questions.${faqItem}.question`)}</AccordionTrigger>
            <AccordionContent>{t(`introduce.faq.questions.${faqItem}.answer`)}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </motion.div>
  );
}
