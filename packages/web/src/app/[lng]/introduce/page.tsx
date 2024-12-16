'use client';
import { PATHS, URL } from '@extension/shared/constants';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, Button } from '@extension/ui';
import { LanguageParams } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';
import Link from 'next/link';

interface IntroductPageProps extends LanguageParams {}

export default function IntroductPage({ params: { lng } }: IntroductPageProps) {
  const { t } = useTranslation(lng);

  return (
    <div className="bg-background min-h-screen">
      {/* Navigation */}
      <nav className="container mx-auto max-w-6xl px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold text-gray-800">{t('introduce.navigation.title')}</div>
          <div className="space-x-4">
            <Button variant="ghost">
              <Link href={PATHS.login}>{t('introduce.navigation.login')}</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-4xl text-center">
          {/* Rating Display */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-white/90 px-6 py-2 text-lg">
            <div className="flex">
              {'★★★★★'.split('').map((star, i) => (
                <span key={i} className="text-yellow-400">
                  {star}
                </span>
              ))}
            </div>
            <span className="font-semibold">5.0</span>
            <span className="text-gray-600">100+ users</span>
          </div>

          <h1 className="mb-6 text-5xl font-bold text-gray-900">{t('introduce.hero.title')}</h1>
          <p className="mb-12 text-xl text-gray-600">{t('introduce.hero.subtitle')}</p>

          {/* Chrome Installation Button */}
          <div className="mb-8 flex justify-center">
            <Link
              href={URL.chromeStore}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-semibold text-gray-800 shadow-lg transition hover:shadow-xl">
              <img src="/images/pngs/chrome.png" alt="Chrome" className="h-6 w-6" />
              {t('introduce.hero.install_button')}
            </Link>
          </div>
        </div>

        {/* Feature Section */}
        <div className="mx-auto mt-24 grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-3">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-xl font-semibold">{t('introduce.features.memo.title')}</h3>
            <p className="text-gray-600">{t('introduce.features.memo.description')}</p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-xl font-semibold">{t('introduce.features.overview.title')}</h3>
            <p className="text-gray-600">{t('introduce.features.overview.description')}</p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
              <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-xl font-semibold">{t('introduce.features.organize.title')}</h3>
            <p className="text-gray-600">{t('introduce.features.organize.description')}</p>
          </div>
        </div>

        {/* Additional Features */}
        <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-2">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-100">
              <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-xl font-semibold">{t('introduce.features.ai_summary.title')}</h3>
            <p className="text-gray-600">{t('introduce.features.ai_summary.description')}</p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-pink-100">
              <svg className="h-6 w-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-xl font-semibold">{t('introduce.features.wishlist.title')}</h3>
            <p className="text-gray-600">{t('introduce.features.wishlist.description')}</p>
          </div>
        </div>
      </main>

      {/* Q&A Section */}
      <div className="mx-auto mt-24 max-w-4xl">
        <h2 className="mb-8 text-center text-3xl font-bold">{t('introduce.faq.title')}</h2>
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
      </div>

      {/* Footer */}
      <footer className="mt-24 bg-gray-50">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            <div>
              <h3 className="mb-4 text-lg font-semibold">{t('introduce.footer.title')}</h3>
              <p className="text-gray-600">{t('introduce.footer.description')}</p>
            </div>
            <div>
              <h4 className="mb-4 text-lg font-semibold">{t('introduce.footer.product.title')}</h4>
              <ul className="space-y-2 text-gray-600">
                <li>{t('introduce.footer.product.features')}</li>
                <li>{t('introduce.footer.product.pricing')}</li>
                <li>{t('introduce.footer.product.use_cases')}</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-lg font-semibold">{t('introduce.footer.company.title')}</h4>
              <ul className="space-y-2 text-gray-600">
                <li>{t('introduce.footer.company.about')}</li>
                <li>{t('introduce.footer.company.blog')}</li>
                <li>{t('introduce.footer.company.careers')}</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-lg font-semibold">{t('introduce.footer.legal.title')}</h4>
              <ul className="space-y-2 text-gray-600">
                <li>{t('introduce.footer.legal.privacy_policy')}</li>
                <li>{t('introduce.footer.legal.terms_of_service')}</li>
                <li>{t('introduce.footer.legal.contact')}</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-gray-200 pt-8 text-center text-gray-600">
            <p>&copy; 2024 {t('introduce.footer.copyright')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
