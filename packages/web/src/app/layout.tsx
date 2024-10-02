// FIXME: supabase버그로 인해 'use client'를 추가한다
'use client';
import { Inter } from 'next/font/google';
import './globals.css';
import { Header } from '@src/components';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="bg-base-100 h-screen">
      <body className={`${inter.className} h-full`}>
        <Header />
        <div className="h-[64px]" />
        {children}
      </body>
    </html>
  );
}
