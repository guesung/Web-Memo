'use server';

import { Header } from '@src/components';
import { LanguageParams } from '@src/modules/i18n';

import { AdditionalFeatures, Features, Footer, Hero, QuestionAndAnswer } from './components';

interface IntroductPageProps extends LanguageParams {}

export default async function IntroductPage({ params: { lng } }: IntroductPageProps) {
  return (
    <div className="bg-background min-h-screen">
      <Header lng={lng} />
      <Header.Margin />
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
