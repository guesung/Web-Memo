import { LanguageParams } from '@src/modules/i18n';
import { Metadata } from 'next';

import { HeaderMargin } from '../../(auth)/memos/_components/Header';
import { UpdateList, UpdateTitle } from './_components';
import DebugCache from '@src/components/DebugCache';

export const metadata: Metadata = {
  title: 'Web Memo | 업데이트 소식 ',
  description: 'Web Memo의 최신 업데이트 소식을 확인하세요.',
};

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
