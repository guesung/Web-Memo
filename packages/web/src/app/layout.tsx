import '@extension/ui/dist/global.css';
import './globals.css';

import { GoogleAnalytics } from '@next/third-parties/google';
import { Toaster } from '@src/components/ui';
import { CONFIG } from '@src/constants';
import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { WebVitals } from './_components';
import { LanguageParams } from '@src/modules/i18n';

interface LayoutProps {
  children: React.ReactNode;
}

const pretendard = localFont({
  src: '../fonts/PretendardVariable.woff2',
  display: 'swap',
  weight: '45 920',
  variable: '--font-pretendard',
  preload: true,
  fallback: ['-apple-system', 'BlinkMacSystemFont', 'system-ui', 'Roboto', 'sans-serif'],
});

const metadataKorean: Metadata = {
  title: '웹 메모',
  description:
    '웹 메모는 웹페이지를 쉽게 저장하고 관리할 수 있는 서비스입니다. 중요한 웹페이지를 효율적으로 정리하고 필요할 때 빠르게 찾아보세요.',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    title: '웹 메모',
    description:
      '웹 메모는 웹페이지를 쉽게 저장하고 관리할 수 있는 서비스입니다. 중요한 웹페이지를 효율적으로 정리하고 필요할 때 빠르게 찾아보세요.',
    locale: 'ko_KR',
    siteName: '웹 메모',
  },
};

const metadataEnglish: Metadata = {
  title: 'Web Memo',
  description:
    'Web Memo is a service that helps you save and manage web pages efficiently. Organize important web pages and find them quickly when needed.',

  robots: 'index, follow',
  openGraph: {
    type: 'website',
    title: 'Web Memo',
    description:
      'Web Memo is a service that helps you save and manage web pages efficiently. Organize important web pages and find them quickly when needed.',
    locale: 'en_US',
    siteName: 'Web Memo',
  },
};

export async function generateMetadata({ params }: LanguageParams) {
  return params.lng === 'ko' ? metadataKorean : metadataEnglish;
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};
export default function Layout({ children }: LayoutProps) {
  return (
    <html className="h-screen" lang="ko" suppressHydrationWarning>
      <body className={`${pretendard.variable} font-pretendard h-full`}>
        {children}

        <WebVitals />
        <GoogleAnalytics gaId={CONFIG.gaId} />
        <Toaster />
      </body>
    </html>
  );
}
