import { Header } from '@src/components';
import { LanguageParams } from '@src/modules/i18n';
import { Metadata } from 'next';

import { AdditionalFeatures, Features, Footer, Hero, ImageSlider, QuestionAndAnswer } from './_components';

export const metadata: Metadata = {
  title: '웹 메모 | 소개 ',
  description: '웹 메모를 소개합니다.',
};

interface IntroductPageProps extends LanguageParams {}

export default function IntroducePage({ params: { lng } }: IntroductPageProps) {
  return (
    <div className="bg-background min-h-screen">
      <Header.Margin />
      <main className="container mx-auto px-4 py-16">
        <Hero lng={lng} />
        <div className="container mx-auto px-4 py-12">
          <ImageSlider lng={lng} />
        </div>
        <Features lng={lng} />
        <AdditionalFeatures lng={lng} />
      </main>
      <QuestionAndAnswer lng={lng} />
      <Footer lng={lng} />
    </div>
  );
}
