import '@extension/ui/dist/global.css';
import '../fonts/output/PretendardVariable.css';
import './globals.css';

import { GoogleAnalytics, GoogleTagManager } from '@next/third-parties/google';
import { Toaster } from '@src/components/ui';
import { CONFIG } from '@src/constants';
import type { Metadata, Viewport } from 'next';
import type { PropsWithChildren } from 'react';

import { WebVitals } from './_components';

interface LayoutProps extends PropsWithChildren {}

const metadataEnglish: Metadata = {
  title: 'Web Memo',
  description:
    'Web Memo is a service for storing and managing web pages easily. Find important web pages efficiently and conveniently.',
};

export async function generateMetadata() {
  return metadataEnglish;
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function Layout({ children }: LayoutProps) {
  return (
    <html suppressHydrationWarning lang="ko">
      <body>
        {children}

        <WebVitals />
        <GoogleAnalytics gaId={CONFIG.gaId} />
        <GoogleTagManager gtmId={CONFIG.gtmId} />
        <Toaster />
      </body>
    </html>
  );
}
