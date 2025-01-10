import '@extension/ui/dist/global.css';
import { GoogleAnalytics } from '@next/third-parties/google';
import { AuthProvider, QueryProvider, ThemeProvider } from '@src/components';
import { Toaster } from '@src/components/ui';
import { CONFIG } from '@src/constants';
import { LanguageParams, SUPPORTED_LANGUAGES } from '@src/modules/i18n';
import { dir } from 'i18next';
import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { PropsWithChildren } from 'react';
import { WebVitals } from '../_components';
import { Header } from './(auth)/memos/_components';
import './globals.css';
import Script from 'next/script';
import JsonLD from '../_components/JsonLD';

const pretendard = localFont({
  src: '../../fonts/PretendardVariable.woff2',
  display: 'swap',
  weight: '45 920',
  variable: '--font-pretendard',
  preload: true,
  fallback: ['-apple-system', 'BlinkMacSystemFont', 'system-ui', 'Roboto', 'sans-serif'],
});

const metadataKorean: Metadata = {
  title: '웹 메모',
  description: '웹페이지를 쉽게 저장하고 관리하세요',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    title: '웹 메모',
    description: '웹페이지를 쉽게 저장하고 관리해요',
    locale: 'ko_KR',
    siteName: '웹 메모',
  },
};

const metadataEnglish: Metadata = {
  title: 'Web Memo',
  description: 'Store and manage web pages easily',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    title: 'Web Memo',
    description: 'Store and manage web pages easily',
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

export async function generateStaticParams() {
  return SUPPORTED_LANGUAGES.map(lng => ({ lng }));
}

interface RootLayoutProps extends PropsWithChildren, LanguageParams {}

export default function RootLayout({ children, params: { lng } }: RootLayoutProps) {
  return (
    <html lang={lng} className="h-screen" dir={dir(lng)} suppressHydrationWarning>
      <body className={`${pretendard.variable} font-pretendard h-full`}>
        <ThemeProvider>
          <QueryProvider lng={lng}>
            <AuthProvider>
              <Header lng={lng} />
              {children}
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>

        <WebVitals />
        <GoogleAnalytics gaId={CONFIG.gaId} />
        <Toaster />

        <JsonLD />
      </body>
    </html>
  );
}
