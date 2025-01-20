import { LanguageParams } from '@src/modules/i18n';
import { Metadata } from 'next';

import { HeaderMargin } from '../../(auth)/memos/_components/Header';
import { UpdateList, UpdateTitle } from './_components';

const metadataKorean: Metadata = {
  title: '웹 메모 | 업데이트 소식 ',
  description: '웹 메모의 최신 업데이트 소식을 확인하세요.',
};

const metadataEnglish: Metadata = {
  title: 'Web Memo | Updates',
  description: 'Check out the latest updates for Web Memo.',
};

export async function generateMetadata({ params }: LanguageParams) {
  return params.lng === 'ko' ? metadataKorean : metadataEnglish;
}

interface UpdatesPageProps extends LanguageParams {}

export default async function UpdatesPage({ params: { lng } }: UpdatesPageProps) {
  return (
    <div className="bg-background min-h-screen">
      <HeaderMargin />
      <main className="container mx-auto px-4 py-16">
        <UpdateTitle lng={lng} />
        <UpdateList lng={lng} />
      </main>
    </div>
  );
}
