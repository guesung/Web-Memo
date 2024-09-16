import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Footer, Header } from '@src/components';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Web Memo',
  description: 'Web Memo',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="bg-base-100 h-full">
      <Header />
      <body className={`${inter.className} h-full`}>{children}</body>
      <Footer />
    </html>
  );
}
