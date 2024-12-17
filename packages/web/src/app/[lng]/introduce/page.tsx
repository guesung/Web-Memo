'use server';

import { LanguageParams } from '@src/modules/i18n';

import AdditionalFeatures from './components/AdditionalFeatures';
import Features from './components/Features';
import Footer from './components/Footer';
import Header from './components/Header';
import Hero from './components/Hero';
import QuestionAndAnswer from './components/QuestionAndAnswer';

interface IntroductPageProps extends LanguageParams {}

export default async function IntroductPage({ params: { lng } }: IntroductPageProps) {
  return (
    <div className="bg-background min-h-screen">
      <Header lng={lng} />
      <main className="container mx-auto px-4 py-16">
        <Hero lng={lng} />
        <Features lng={lng} />
        <AdditionalFeatures lng={lng} />
      </main>
      <QuestionAndAnswer lng={lng} />
      <Footer lng={lng} />
    </div>
  );
}
