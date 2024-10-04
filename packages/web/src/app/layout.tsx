import { Inter } from 'next/font/google';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import './globals.css';
import { Header, QueryProvider } from '@src/components';
import type { Metadata } from 'next';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '웹 메모',
  description: '웹 메모',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="bg-base-100 h-screen" data-theme="cupcake">
      <body className={`${inter.className} h-full`}>
        <QueryProvider>
          <Header />
          {children}
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryProvider>
      </body>
    </html>
  );
}
