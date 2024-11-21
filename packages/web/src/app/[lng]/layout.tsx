import localFont from 'next/font/local';
import '@extension/ui/dist/global.css';
import { Header, QueryProvider, ThemeProvider } from '@src/components';
import { Toaster } from '@src/components/ui/toaster';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { Metadata } from 'next';
import { PropsWithChildren } from 'react';
import './globals.css';
import { dir } from 'i18next';

import { appWithTranslation } from 'next-i18next';
import { languages } from '@src/constants';

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

interface RootLayoutProps extends PropsWithChildren {
  params: {
    lng: string;
  };
}

export default function RootLayout({ children, params: { lng } }: RootLayoutProps) {
  return (
    <html lang={lng} className="h-screen" dir={dir(lng)}>
      <body className={`${pretendard.variable} font-pretendard h-full`}>
        <ThemeProvider attribute="class" defaultTheme="system">
          <QueryProvider>
            <Header />

            {children}
            {/* <ReactQueryDevtools initialIsOpen={false} /> */}
          </QueryProvider>
        </ThemeProvider>

        <Toaster />
      </body>
    </html>
  );
}
