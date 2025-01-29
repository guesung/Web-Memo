'use client';

import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/util.client';
import { motion } from 'framer-motion';

interface FeaturesProps extends LanguageType {}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function Features({ lng }: FeaturesProps) {
  const { t } = useTranslation(lng);

  const features = [
    {
      icon: (
        <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
          />
        </svg>
      ),
      title: t('introduce.features.memo.title'),
      description: t('introduce.features.memo.description'),
      color: 'blue',
    },
    {
      icon: (
        <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
      title: t('introduce.features.overview.title'),
      description: t('introduce.features.overview.description'),
      color: 'green',
    },
    {
      icon: (
        <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      ),
      title: t('introduce.features.organize.title'),
      description: t('introduce.features.organize.description'),
      color: 'purple',
    },
  ];

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="mx-auto mt-24 grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-3">
      {features.map((feature, index) => (
        <motion.div
          key={index}
          variants={fadeInUp}
          className="rounded-xl bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-md dark:bg-gray-800">
          <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-${feature.color}-100`}>
            {feature.icon}
          </div>
          <h3 className="mb-2 text-xl font-semibold dark:text-gray-100">{feature.title}</h3>
          <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
        </motion.div>
      ))}
    </motion.div>
  );
}
