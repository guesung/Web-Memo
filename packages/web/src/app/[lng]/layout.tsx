import '@extension/ui/dist/global.css';
import { ExtensionDialog, Header, QueryProvider, ThemeProvider } from '@src/components';
import { Toaster } from '@src/components/ui/toaster';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { dir } from 'i18next';
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { PropsWithChildren } from 'react';
import './globals.css';

import { languages } from '../i18n/settings';
import { LanguageParams } from '../i18n/type';

const pretendard = localFont({
  src: '../../fonts/PretendardVariable.woff2',
  display: 'swap',
  weight: '45 920',
  variable: '--font-pretendard',
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
    <html lang={lng} className="h-screen" dir={dir(lng)}>
      <body className={`${pretendard.variable} font-pretendard h-full`}>
        <ThemeProvider attribute="class" defaultTheme="system">
          <QueryProvider>
            <Header lng={lng} />

            {children}
            <ReactQueryDevtools initialIsOpen={false} />
          </QueryProvider>
        </ThemeProvider>

        <Toaster />
        <ExtensionDialog />
      </body>
    </html>
  );
}
