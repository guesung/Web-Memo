import { Inter } from 'next/font/google';
import './globals.css';
import { Header } from '@src/components';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="bg-base-100 h-screen">
      <body className={`${inter.className} h-full`}>
        <Header />
        {children}
      </body>
    </html>
  );
}
