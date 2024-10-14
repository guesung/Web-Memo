import localFont from 'next/font/local';

import { QueryProvider } from '@src/components';
import type { Metadata } from 'next';
import { PropsWithChildren } from 'react';
import './globals.css';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Bounce, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
    <html lang="ko" className="bg-base-100 h-screen" data-theme="cupcake">
      <body className={`${pretendard.variable} font-pretendard h-full`}>
        <QueryProvider>
          {children}
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryProvider>
        <ToastContainer
          position="bottom-right"
          autoClose={2000}
          closeOnClick
          draggable
          pauseOnHover
          theme="light"
          transition={Bounce}
        />
      </body>
    </html>
  );
}
