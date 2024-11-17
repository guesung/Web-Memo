import localFont from 'next/font/local';

import { QueryProvider, ThemeProvider } from '@src/components';
import { Toaster } from '@src/components/ui/toaster';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { Metadata } from 'next';
import { PropsWithChildren } from 'react';
import './globals.css';

const pretendard = localFont({
  src: '../fonts/PretendardVariable.woff2',
  display: 'swap',
  weight: '45 920',
  variable: '--font-pretendard',
});

export const metadata: Metadata = {
  title: '웹 메모',
  description: '웹 메모',
};

interface RootLayoutProps extends PropsWithChildren {}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ko" className="bg-background h-screen">
      <body className={`${pretendard.variable} font-pretendard h-full`}>
        <ThemeProvider attribute="class" defaultTheme="system">
          <QueryProvider>
            {children}
            <ReactQueryDevtools initialIsOpen={false} />
          </QueryProvider>
        </ThemeProvider>

        <Toaster />
      </body>
    </html>
  );
}
