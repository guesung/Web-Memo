'use client';

import useTranslation from '@src/modules/i18n/client';
import { motion } from 'framer-motion';

interface FooterProps {
  lng: string;
}

export default function Footer({ lng }: FooterProps) {
  const { t } = useTranslation(lng);

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
      className="mt-24 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-12">
        <div className="pt-8 text-center text-gray-600 dark:text-gray-400">
          <p>&copy; 2024 {t('introduce.footer.copyright')}</p>
        </div>
      </div>
    </motion.footer>
  );
}
