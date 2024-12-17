'use client';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';
import { motion } from 'framer-motion';

interface UpdateTitleProps extends LanguageType {}

export default function UpdateTitle({ lng }: UpdateTitleProps) {
  const { t } = useTranslation(lng);

  return (
    <motion.h1
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-8 text-4xl font-bold">
      {t('updates.title')}
    </motion.h1>
  );
}
