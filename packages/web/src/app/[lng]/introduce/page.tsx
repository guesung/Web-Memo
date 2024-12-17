'use server';

import { Header } from '@src/components';
import { LanguageParams } from '@src/modules/i18n';

import { AdditionalFeatures, Features, Footer, Hero, ImageSlider, QuestionAndAnswer } from './components';

interface IntroductPageProps extends LanguageParams {}

export default async function IntroductPage({ params: { lng } }: IntroductPageProps) {
  const images = [
    '/images/pngs/introduction_1.png',
    '/images/pngs/introduction_2.png',
    '/images/pngs/introduction_3.png',
    '/images/pngs/introduction_4.png',
    '/images/pngs/introduction_5.png',
  ];

  return (
    <div className="bg-background min-h-screen">
      <Header.Margin />
      <main className="container mx-auto px-4 py-16">
        <Hero lng={lng} />
        <div className="container mx-auto px-4 py-8">
          <ImageSlider images={images} />
        </div>
        <Features lng={lng} />
        <AdditionalFeatures lng={lng} />
      </main>
      <QuestionAndAnswer lng={lng} />
      <Footer lng={lng} />
    </div>
  );
}
