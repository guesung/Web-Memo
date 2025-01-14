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

const pretendard = localFont({
  src: [{ path: '../../fonts/PretendardVariableSubset.woff2' }, { path: '../../fonts/PretendardVariableSubset.woff' }],
  display: 'swap',
  weight: '45 920',
  variable: '--font-pretendard',
  preload: true,
  fallback: ['-apple-system', 'BlinkMacSystemFont', 'system-ui', 'Roboto', 'sans-serif'],
});

export async function generateStaticParams() {
  return SUPPORTED_LANGUAGES.map(lng => ({ lng }));
}

export const metadata: Metadata = {
  title: '웹 메모',
  description: '웹페이지를 쉽게 저장하고 관리하세요',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    title: '웹 메모',
    description: '웹페이지를 쉽게 저장하고 관리하세요',
    locale: 'ko_KR',
    siteName: '웹 메모',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

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
      </body>
    </html>
  );
}
