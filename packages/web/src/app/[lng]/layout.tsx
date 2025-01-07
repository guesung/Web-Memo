import '@extension/ui/dist/global.css';
import './globals.css';
import { GoogleAnalytics } from '@next/third-parties/google';
import { Header, QueryProvider, ThemeProvider } from '@src/components';
import { Toaster } from '@src/components/ui';
import { LanguageParams, languages } from '@src/modules/i18n';
import { dir } from 'i18next';
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { PropsWithChildren } from 'react';
import { WebVitals } from '../_components';

const pretendard = localFont({
  src: '../../fonts/PretendardVariable.woff2',
  display: 'swap',
  weight: '45 920',
  variable: '--font-pretendard',
  preload: true,
});

export async function generateStaticParams() {
  return languages.map(lng => ({ lng }));
}

export const metadata: Metadata = {
  title: '웹 메모',
  description: '웹 메모',
};

interface RootLayoutProps extends PropsWithChildren, LanguageParams {}

export default function RootLayout({ children, params: { lng } }: RootLayoutProps) {
  return (
    <html lang={lng} className="h-screen" dir={dir(lng)} suppressHydrationWarning>
      <body className={`${pretendard.variable} font-pretendard h-full`}>
        <ThemeProvider>
          <QueryProvider lng={lng}>
            <Header lng={lng} />
            {children}
          </QueryProvider>
        </ThemeProvider>

        <WebVitals />
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID as string} />
        <Toaster />
      </body>
    </html>
  );
}
