import Header from '@src/components/Header';
import type { LanguageParams } from '@src/modules/i18n';
import { SUPPORTED_LANGUAGES } from '@src/modules/i18n';
import { dir } from 'i18next';
import type { Metadata } from 'next';
import type { PropsWithChildren } from 'react';

import { InitDayjs } from '../_components';
import { QueryProvider, ThemeProvider } from './_components';

interface RootLayoutProps extends PropsWithChildren, LanguageParams {}

export async function generateStaticParams() {
  return SUPPORTED_LANGUAGES.map(lng => ({ lng }));
}

const metadataKorean: Metadata = {
  title: '웹 메모',
  description:
    '웹 메모는 웹페이지를 쉽게 저장하고 관리할 수 있는 서비스입니다. 중요한 웹페이지를 효율적으로 정리하고 필요할 때 빠르게 찾아보세요.',
};

const metadataEnglish: Metadata = {
  title: 'Web Memo',
  description:
    'Web Memo is a service for storing and managing web pages easily. Find important web pages efficiently and conveniently.',
};

export async function generateMetadata({ params }: LanguageParams) {
  return params.lng === 'ko' ? metadataKorean : metadataEnglish;
}

export default function RootLayout({ children, params: { lng } }: RootLayoutProps) {
  return (
    <div lang={lng} dir={dir(lng)} className="h-screen">
      <ThemeProvider>
        <QueryProvider lng={lng}>
          <Header lng={lng} />
          {children}
        </QueryProvider>
      </ThemeProvider>

      <InitDayjs lng={lng} />

      <link
        rel="stylesheet"
        as="style"
        href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
      />
    </div>
  );
}
