import '@extension/ui/global.css';
// import '../fonts/output/PretendardVariable.css';
import './globals.css';

import { Loading, Toaster } from '@extension/ui';
import { GoogleAnalytics, GoogleTagManager } from '@next/third-parties/google';
import { CONFIG } from '@src/constants';
import type { Metadata, Viewport } from 'next';
import { type PropsWithChildren, Suspense } from 'react';

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
        <Suspense fallback={<Loading />}>{children}</Suspense>

        <WebVitals />
        <GoogleAnalytics gaId={CONFIG.gaId} />
        <GoogleTagManager gtmId={CONFIG.gtmId} />
        <Toaster />
      </body>
    </html>
  );
}
