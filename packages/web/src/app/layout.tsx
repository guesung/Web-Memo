import '@extension/ui/dist/global.css';

import { GoogleAnalytics } from '@next/third-parties/google';
import { Toaster } from '@src/components/ui';
import { CONFIG } from '@src/constants';
import type { Viewport } from 'next';
import { PropsWithChildren } from 'react';
import { WebVitals } from './_components';
import '../fonts/output/PretendardVariable.css';
import './globals.css';

interface LayoutProps extends PropsWithChildren {}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function Layout({ children }: LayoutProps) {
  return (
    <html className="h-screen" suppressHydrationWarning>
      <body className="h-full">
        {children}

        <WebVitals />
        <GoogleAnalytics gaId={CONFIG.gaId} />
        <Toaster />
      </body>
    </html>
  );
}
