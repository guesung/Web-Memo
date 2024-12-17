'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@extension/ui';
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
        <AccordionItem value="item-1">
          <AccordionTrigger>{t('introduce.faq.questions.what_is.question')}</AccordionTrigger>
          <AccordionContent>{t('introduce.faq.questions.what_is.answer')}</AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-2">
          <AccordionTrigger>{t('introduce.faq.questions.is_free.question')}</AccordionTrigger>
          <AccordionContent>{t('introduce.faq.questions.is_free.answer')}</AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-3">
          <AccordionTrigger>{t('introduce.faq.questions.where_to_save.question')}</AccordionTrigger>
          <AccordionContent>{t('introduce.faq.questions.where_to_save.answer')}</AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-4">
          <AccordionTrigger>{t('introduce.faq.questions.where_to_find.question')}</AccordionTrigger>
          <AccordionContent>{t('introduce.faq.questions.where_to_find.answer')}</AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-5">
          <AccordionTrigger>{t('introduce.faq.questions.memo_preservation.question')}</AccordionTrigger>
          <AccordionContent>{t('introduce.faq.questions.memo_preservation.answer')}</AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-6">
          <AccordionTrigger>{t('introduce.faq.questions.how_ai_works.question')}</AccordionTrigger>
          <AccordionContent>{t('introduce.faq.questions.how_ai_works.answer')}</AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-7">
          <AccordionTrigger>{t('introduce.faq.questions.other_browsers.question')}</AccordionTrigger>
          <AccordionContent>{t('introduce.faq.questions.other_browsers.answer')}</AccordionContent>
        </AccordionItem>
      </Accordion>
    </motion.div>
  );
}
