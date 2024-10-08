import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import localFont from 'next/font/local';

import { Header, QueryProvider } from '@src/components';
import type { Metadata } from 'next';
import './globals.css';
import { PropsWithChildren } from 'react';
import { headers } from 'next/headers';

const pretendard = localFont({
  src: '../fonts/PretendardVariable.woff2',
  display: 'swap',
  weight: '45 920',
  variable: '--font-pretendard',
});

const HIDE_HEADER_PATH_LIST = ['/memo'];

export const metadata: Metadata = {
  title: '웹 메모',
  description: '웹 메모',
};

interface RootLayoutProps extends PropsWithChildren {}

export default function RootLayout({ children }: RootLayoutProps) {
  const headersList = headers();
  const pathname = headersList.get('pathname') ?? '/';

  return (
    <html lang="ko" className="bg-base-100 h-screen" data-theme="cupcake">
      <body className={`${pretendard.variable} font-pretendard h-full`}>
        <QueryProvider>
          {!HIDE_HEADER_PATH_LIST.includes(pathname) ? <Header /> : null}
          <Header.Margin />
          {children}
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryProvider>
      </body>
    </html>
  );
}
