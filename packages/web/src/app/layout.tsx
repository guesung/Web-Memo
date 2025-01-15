import '@extension/ui/dist/global.css';
import './globals.css';

import { GoogleAnalytics } from '@next/third-parties/google';
import { Toaster } from '@src/components/ui';
import { CONFIG } from '@src/constants';
import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { WebVitals } from './_components';

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

export default function Layout({ children }: LayoutProps) {
  return (
    <html className="h-screen" suppressHydrationWarning>
      <body className={`${pretendard.variable} font-pretendard h-full`}>
        {children}

        <WebVitals />
        <GoogleAnalytics gaId={CONFIG.gaId} />
        <Toaster />
      </body>
    </html>
  );
}
