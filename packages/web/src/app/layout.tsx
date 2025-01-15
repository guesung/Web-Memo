import '@extension/ui/dist/global.css';
import './globals.css';

import { GoogleAnalytics } from '@next/third-parties/google';
import { Toaster } from '@src/components/ui';
import { CONFIG } from '@src/constants';
import { LanguageParams } from '@src/modules/i18n';
import type { Viewport } from 'next';
import { WebVitals } from './_components';
import { metadataEnglish, metadataKorean, pretendard } from './_constants';
import { PropsWithChildren } from 'react';

interface LayoutProps extends PropsWithChildren {}

export async function generateMetadata({ params }: LanguageParams) {
  return params.lng === 'ko' ? metadataKorean : metadataEnglish;
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function Layout({ children }: LayoutProps) {
  return (
    <html className="h-screen" lang="ko" suppressHydrationWarning>
      <body className={`${pretendard.variable} font-pretendard h-full`}>
        {children}

        <WebVitals />
        <GoogleAnalytics gaId={CONFIG.gaId} />
        <Toaster />
      </body>
    </html>
  );
}
