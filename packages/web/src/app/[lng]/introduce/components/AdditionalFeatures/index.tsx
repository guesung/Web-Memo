'use client';

import useTranslation from '@src/modules/i18n/client';
import { motion } from 'framer-motion';

interface AdditionalFeaturesProps {
  lng: string;
}

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

export default function AdditionalFeatures({ lng }: AdditionalFeaturesProps) {
  const { t } = useTranslation(lng);

  const features = [
    {
      icon: (
        <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      ),
      title: t('introduce.features.ai_summary.title'),
      description: t('introduce.features.ai_summary.description'),
      color: 'yellow',
    },
    {
      icon: (
        <svg className="h-6 w-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      ),
      title: t('introduce.features.wishlist.title'),
      description: t('introduce.features.wishlist.description'),
      color: 'pink',
    },
  ];

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-2">
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
