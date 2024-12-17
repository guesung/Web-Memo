import { Header } from '@src/components';
import { LanguageParams } from '@src/modules/i18n';
import { Metadata } from 'next';

import { UpdateList, UpdateTitle } from './components';

export const metadata: Metadata = {
  title: '업데이트 소식 | Page Summary',
  description: 'Page Summary의 최신 업데이트 소식을 확인하세요.',
};

interface UpdatesPageProps extends LanguageParams {}

export default async function UpdatesPage({ params: { lng } }: UpdatesPageProps) {
  return (
    <div className="bg-background min-h-screen">
      <Header.Margin />
      <main className="container mx-auto px-4 py-16">
        <UpdateTitle lng={lng} />
        <UpdateList lng={lng} />
      </main>
    </div>
  );
}
