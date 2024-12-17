'use client';

import { URL } from '@extension/shared/constants';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface HeroProps extends LanguageType {}

export default function Hero({ lng }: HeroProps) {
  const { t } = useTranslation(lng);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="mx-auto max-w-4xl text-center">
      {/* Rating Display */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mb-8 inline-flex items-center gap-2 rounded-full bg-white/90 px-6 py-2 text-lg dark:bg-gray-800/90">
        <div className="flex">
          {'★★★★★'.split('').map((star, i) => (
            <span key={i} className="text-yellow-400">
              {star}
            </span>
          ))}
        </div>
        <span className="font-semibold dark:text-gray-100">5.0</span>
        <span className="text-gray-600 dark:text-gray-400">100+ users</span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mb-6 text-5xl font-bold text-gray-900 dark:text-gray-100">
        {t('introduce.hero.title')}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="mb-12 text-xl text-gray-600 dark:text-gray-400">
        {t('introduce.hero.subtitle')}
      </motion.p>

      {/* Chrome Installation Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="mb-8 flex justify-center">
        <Link
          href={URL.chromeStore}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-semibold text-gray-800 shadow-lg transition hover:shadow-xl dark:bg-gray-800 dark:text-gray-100">
          <img src="/images/pngs/chrome.png" alt="Chrome" className="h-6 w-6" />
          {t('introduce.hero.install_button')}
        </Link>
      </motion.div>
    </motion.div>
  );
}
