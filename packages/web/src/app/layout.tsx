import '@extension/ui/dist/global.css';

import { GoogleAnalytics, GoogleTagManager } from '@next/third-parties/google';
import { Toaster } from '@src/components/ui';
import { CONFIG } from '@src/constants';
import type { Metadata, Viewport } from 'next';
import { PropsWithChildren } from 'react';
import '../fonts/output/PretendardVariable.css';
import { WebVitals } from './_components';
import './globals.css';

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
    <html suppressHydrationWarning>
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
