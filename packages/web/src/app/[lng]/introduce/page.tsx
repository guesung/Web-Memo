'use client';
import { PATHS, URL } from '@extension/shared/constants';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, Button } from '@extension/ui';
import { LanguageParams } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface IntroductPageProps extends LanguageParams {}

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

export default function IntroductPage({ params: { lng } }: IntroductPageProps) {
  const { t } = useTranslation(lng);

  return (
    <div className="bg-background min-h-screen">
      {/* Navigation */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto max-w-6xl px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('introduce.navigation.title')}</div>
          <div className="space-x-4">
            <Button variant="ghost">
              <Link href={PATHS.login}>{t('introduce.navigation.login')}</Link>
            </Button>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
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

        {/* Feature Section */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="mx-auto mt-24 grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-3">
          {[
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
          ].map((feature, index) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              className="rounded-xl bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-md dark:bg-gray-800">
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-${feature.color}-100`}>
                {feature.icon}
              </div>
              <h3 className="mb-2 text-xl font-semibold">{feature.title}</h3>
              <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Additional Features */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-2">
          {[
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
          ].map((feature, index) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              className="rounded-xl bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-md dark:bg-gray-800">
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-${feature.color}-100`}>
                {feature.icon}
              </div>
              <h3 className="mb-2 text-xl font-semibold">{feature.title}</h3>
              <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </main>

      {/* Q&A Section */}
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

      {/* Footer */}
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
    </div>
  );
}
