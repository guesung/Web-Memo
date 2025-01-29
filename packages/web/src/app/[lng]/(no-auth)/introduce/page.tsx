import { LanguageParams } from '@src/modules/i18n';
import { Metadata } from 'next';

import { HeaderMargin } from '@src/components/Header';
import { AdditionalFeatures, Features, Footer, Hero, ImageSlider, QuestionAndAnswer } from './_components';

const metadataKorean: Metadata = {
  title: '웹 메모 | 소개 ',
  description:
    '웹 메모는 웹페이지를 쉽게 저장하고 관리할 수 있는 서비스입니다. 중요한 웹페이지를 효율적으로 정리하고 필요할 때 빠르게 찾아보세요.',
};

const metadataEnglish: Metadata = {
  title: 'Web Memo | Introduce',
  description:
    'Web Memo is a service for storing and managing web pages easily. Find important web pages efficiently and conveniently.',
};

export async function generateMetadata({ params }: LanguageParams) {
  return params.lng === 'ko' ? metadataKorean : metadataEnglish;
}

interface IntroducePageProps extends LanguageParams {}

export default function IntroducePage({ params: { lng } }: IntroducePageProps) {
  return (
    <div className="bg-background min-h-screen">
      <HeaderMargin />
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
